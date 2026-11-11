const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const compiled = ts.transpileModule(
  fs.readFileSync(path.join(__dirname, '../lib/channel-ratios.ts'), 'utf8'),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }
).outputText;
const ratios = {};
new Function('exports', compiled)(ratios);
const {
  normalizeBillingTag,
  billingTagKey,
  billingTagFromKey,
  parseChannelRatios,
  serializeChannelRatios,
  withRatioInput,
  hasChannelTypeRatios,
  withoutChannelTypeRatios,
  billingTagRows,
  BILLING_TAG_INPUT_PATTERN
} = ratios;

test('billing tags normalize the same way as the backend', () => {
  const cases = {
    ' Vertex-Claude ': 'vertex-claude',
    'vertex.gemini_2': 'vertex.gemini_2',
    '': '',
    '   ': '',
    'vertex claude': '',
    'tag:vertex': '',
    渠道: '',
    ['a'.repeat(64)]: 'a'.repeat(64),
    ['a'.repeat(65)]: ''
  };
  for (const [input, want] of Object.entries(cases)) {
    assert.equal(normalizeBillingTag(input), want, JSON.stringify(input));
  }
  assert.equal(billingTagKey('vertex-claude'), 'tag:vertex-claude');
  assert.equal(billingTagFromKey('TAG: Vertex-Claude '), 'vertex-claude');
  assert.equal(billingTagFromKey('48'), '');
  assert.equal(billingTagFromKey('tag:bad tag'), '');
  // 渠道表单允许大写输入（保存时转小写），不允许空格和其他符号
  assert.ok(BILLING_TAG_INPUT_PATTERN.test('Vertex-Claude_1.5'));
  assert.ok(BILLING_TAG_INPUT_PATTERN.test(''));
  assert.ok(!BILLING_TAG_INPUT_PATTERN.test('vertex claude'));
  assert.ok(!BILLING_TAG_INPUT_PATTERN.test('tag:vertex'));
});

test('channel_ratios keeps channel types and canonicalizes billing tag keys', () => {
  assert.deepEqual(
    parseChannelRatios(
      '{"48":0.9,"14":0,"tag:vertex-gemini":0.7,"tag:Vertex-Claude":0.85,"tag:zero":0}'
    ),
    { 48: 0.9, 'tag:vertex-gemini': 0.7, 'tag:vertex-claude': 0.85 }
  );
  // 同一标签有多种写法：以规范写法为准；没有规范写法时取排在最前的（与后端一致）
  assert.deepEqual(
    parseChannelRatios(
      '{"tag:Vertex":0.5,"tag:vertex":0.8,"TAG: vertex ":0.6}'
    ),
    { 'tag:vertex': 0.8 }
  );
  assert.deepEqual(
    parseChannelRatios('{"tag:Vertex":0.5,"TAG: vertex ":0.6}'),
    { 'tag:vertex': 0.6 }
  );
  for (const raw of ['', undefined, null, 'not json', '[]', '"text"', 48]) {
    assert.deepEqual(parseChannelRatios(raw), {}, JSON.stringify(raw));
  }

  const parsed = parseChannelRatios('{"48":0.9,"tag:vertex.gemini":0.7}');
  assert.deepEqual(parseChannelRatios(serializeChannelRatios(parsed)), parsed);
  assert.equal(serializeChannelRatios({}), '');
  assert.equal(serializeChannelRatios(undefined), '');
  assert.equal(serializeChannelRatios({ 48: undefined, 14: 0 }), '');
});

test('ratio input writes, clears or rejects one key without touching the others', () => {
  const base = { 48: 0.9, 'tag:vertex-claude': 0.85 };
  assert.deepEqual(withRatioInput(base, 'tag:vertex-gemini', ' 0.7 '), {
    48: 0.9,
    'tag:vertex-claude': 0.85,
    'tag:vertex-gemini': 0.7
  });
  assert.deepEqual(withRatioInput(base, 'tag:vertex-claude', ''), { 48: 0.9 });
  assert.deepEqual(withRatioInput(base, '48', ''), {
    'tag:vertex-claude': 0.85
  });
  for (const invalid of ['0', '-1', 'abc', 'Infinity']) {
    assert.equal(withRatioInput(base, '48', invalid), null, invalid);
  }
  assert.deepEqual(base, { 48: 0.9, 'tag:vertex-claude': 0.85 });
});

test('resetting channel types keeps billing tag discounts', () => {
  const base = { 48: 0.9, 14: 0.8, 'tag:vertex-claude': 0.85 };
  assert.equal(hasChannelTypeRatios(base), true);
  assert.deepEqual(withoutChannelTypeRatios(base), {
    'tag:vertex-claude': 0.85
  });
  assert.equal(hasChannelTypeRatios({ 'tag:vertex-claude': 0.85 }), false);
  assert.equal(hasChannelTypeRatios({}), false);
});

test('tag rows list channel tags first, then saved tags no channel uses', () => {
  const saved = {
    48: 0.9,
    'tag:vertex-claude': 0.85,
    'tag:retired': 0.6,
    'tag:also-retired': 0.5
  };
  const channelTags = [
    { tag: 'vertex-claude', channel_count: 2 },
    { tag: 'vertex-gemini', channel_count: 1 },
    { tag: 'vertex-claude', channel_count: 9 },
    { tag: 'bad tag', channel_count: 1 }
  ];
  assert.deepEqual(billingTagRows(saved, channelTags), [
    { tag: 'vertex-claude', status: 'active', channelCount: 2, ratio: 0.85 },
    {
      tag: 'vertex-gemini',
      status: 'active',
      channelCount: 1,
      ratio: undefined
    },
    { tag: 'also-retired', status: 'unused', channelCount: 0, ratio: 0.5 },
    { tag: 'retired', status: 'unused', channelCount: 0, ratio: 0.6 }
  ]);
  assert.deepEqual(billingTagRows({ 48: 0.9 }, []), []);
  // 标签列表加载失败：已保存的折扣照常列出，但无法判断是否还在使用
  assert.deepEqual(billingTagRows(saved, null), [
    { tag: 'also-retired', status: 'unknown', channelCount: 0, ratio: 0.5 },
    { tag: 'retired', status: 'unknown', channelCount: 0, ratio: 0.6 },
    { tag: 'vertex-claude', status: 'unknown', channelCount: 0, ratio: 0.85 }
  ]);
});

test('editing through the whole record keeps the user form submittable', async () => {
  const { createFormControl } = require('react-hook-form');
  const { zodResolver } = require('@hookform/resolvers/zod');
  const z = require('zod');
  // 与 sections/user/user-form.tsx 的 channel_ratios 校验一致
  const schema = z.object({
    channel_ratios: z.record(z.string(), z.number()).optional()
  });
  // current 对应编辑器里 useController 的 field.value
  let current = parseChannelRatios('{"48":0.9}');
  const form = createFormControl({
    resolver: zodResolver(schema),
    defaultValues: { channel_ratios: current }
  });
  const edit = (key, raw) => {
    const next = withRatioInput(current, key, raw);
    if (!next) return;
    current = next;
    form.setValue('channel_ratios', next);
  };
  // 带点号的标签不能被当成嵌套路径
  edit('tag:vertex.gemini', '0.7');
  edit('tag:vertex-claude', '0.85');
  edit('tag:vertex-claude', '');
  edit('14', 'abc');

  let submitted;
  let invalid;
  await form.handleSubmit(
    (values) => {
      submitted = values;
    },
    (errors) => {
      invalid = errors;
    }
  )();
  assert.equal(invalid, undefined);
  assert.deepEqual(
    JSON.parse(serializeChannelRatios(submitted.channel_ratios)),
    { 48: 0.9, 'tag:vertex.gemini': 0.7 }
  );
});
