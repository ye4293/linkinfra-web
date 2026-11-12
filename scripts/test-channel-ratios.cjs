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
  parseRatioInput,
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
    // 非 ASCII 字符一律不接受，不会被大小写转换变成另一个合法标签（U+212A 的小写是 k）。
    // 用码点构造，免得源码里出现和 ASCII 字母长得一样的字符。
    ['vertex-' + String.fromCharCode(0x212a) + 'laude']: '',
    [String.fromCharCode(0x130) + 'stanbul']: '',
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
  // 首尾空白按后端 strings.TrimSpace 的口径：U+0085 算空白，U+FEFF 不算
  assert.equal(
    billingTagFromKey('tag:vertex' + String.fromCharCode(0x85)),
    'vertex'
  );
  assert.equal(
    billingTagFromKey(String.fromCharCode(0xfeff) + 'tag:vertex'),
    ''
  );
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

test('channel_ratios drops keys billing ignores and reads channel types as integers', () => {
  // 计费不认的 key 不带回表单：名字不合法的 tag: 项会让后端拒绝保存，
  // 名为 target 的 key 会被表单库当成事件对象
  assert.deepEqual(
    parseChannelRatios(
      '{"48":0.9,"abc":0.5,"target":0.3,"tag:bad tag":0.5,"tag:":0.5,"-1":0.5,"0":0.5,"__proto__":0.5}'
    ),
    { 48: 0.9 }
  );
  // 后端按整数识别渠道类型；同一类型有多种写法时排在后面的生效
  assert.deepEqual(parseChannelRatios('{"048":0.5}'), { 48: 0.5 });
  assert.deepEqual(parseChannelRatios('{"048":0.5,"48":0.9,"+48":0.7}'), {
    48: 0.9
  });
  assert.deepEqual(parseChannelRatios('{" 48":0.5,"4 8":0.5,"4.8":0.5}'), {});
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

  // 输入框文本的三种结果：留空是不设置，正数是折扣（位数不限），其余无效
  assert.equal(parseRatioInput(''), undefined);
  assert.equal(parseRatioInput('   '), undefined);
  assert.equal(parseRatioInput(' 0.875 '), 0.875);
  assert.equal(parseRatioInput('1.25'), 1.25);
  assert.equal(parseRatioInput('.5'), 0.5);
  assert.equal(parseRatioInput('2.'), 2);
  for (const invalid of ['0', '0.0', '-1', 'abc', 'Infinity', 'NaN']) {
    assert.equal(parseRatioInput(invalid), null, invalid);
  }
  // 输入框是文本框，只认普通的十进制写法：Number() 接受的其他写法、没输完的内容都无效
  for (const invalid of [
    '.',
    '-',
    '+0.5',
    '1e3',
    '1e-1',
    '0x10',
    '0b11',
    ',',
    '1,2,3',
    '1,000.5',
    '1.2.3',
    '1 2',
    '0.8a',
    '9'.repeat(400)
  ]) {
    assert.equal(parseRatioInput(invalid), null, invalid);
  }
  // 输入法在全角状态下打出的数字和句点按半角处理。用码点构造，免得源码里出现全角字符。
  const fullWidth = (text) =>
    Array.from(text, (ch) =>
      ch === '.'
        ? String.fromCharCode(0xff0e)
        : String.fromCharCode(ch.charCodeAt(0) - 0x30 + 0xff10)
    ).join('');
  assert.equal(parseRatioInput(fullWidth('0.85')), 0.85);
  assert.equal(parseRatioInput('0' + String.fromCharCode(0x3002) + '85'), 0.85);
  assert.equal(parseRatioInput(fullWidth('0')), null);
  assert.deepEqual(withRatioInput({}, '48', fullWidth('0.7')), { 48: 0.7 });
  // 小数点写作逗号的地区，手机的数字键盘上只有逗号：按小数点处理
  assert.equal(parseRatioInput('0,85'), 0.85);
  assert.equal(parseRatioInput('1,5'), 1.5);
  assert.equal(parseRatioInput('0,0'), null);
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
  // 标签可以叫 constructor、__proto__ 这类普通对象上本来就有的名字
  assert.deepEqual(
    billingTagRows({ 'tag:constructor': 0.5, 'tag:tostring': 0.4 }, [
      { tag: 'constructor', channel_count: 1 },
      { tag: '__proto__', channel_count: 2 }
    ]),
    [
      { tag: 'constructor', status: 'active', channelCount: 1, ratio: 0.5 },
      { tag: '__proto__', status: 'active', channelCount: 2, ratio: undefined },
      { tag: 'tostring', status: 'unused', channelCount: 0, ratio: 0.4 }
    ]
  );
  assert.deepEqual(
    billingTagRows(
      parseChannelRatios('{"tag:constructor":0.5,"tag:__proto__":0.4}'),
      []
    ),
    [
      { tag: '__proto__', status: 'unused', channelCount: 0, ratio: 0.4 },
      { tag: 'constructor', status: 'unused', channelCount: 0, ratio: 0.5 }
    ]
  );
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
