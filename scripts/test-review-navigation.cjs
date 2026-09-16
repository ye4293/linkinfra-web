const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

function load(file) {
  const compiled = ts.transpileModule(
    readFileSync(join(__dirname, '..', file), 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020
      }
    }
  );
  const exports = {};
  new Function('exports', compiled.outputText)(exports);
  return exports;
}
const navigation = load('lib/api-key-navigation.ts');
const models = load('lib/client-models.ts');

test('selected model and language survive both direct and sign-in links', () => {
  const model = 'vendor/custom model+v1&beta';
  for (const authenticated of [true, false]) {
    const url = new URL(navigation.apiKeyHref(authenticated, model, 'zh'));
    assert.equal(url.origin, 'https://platform.linkinfra.ai');
    assert.equal(url.searchParams.get('lang'), 'zh');
    const destination = authenticated
      ? url
      : new URL(url.searchParams.get('callbackUrl'), url.origin);
    assert.equal(destination.pathname, '/dashboard/token');
    assert.equal(destination.searchParams.get('model'), model);
    assert.equal(destination.searchParams.get('lang'), 'zh');
  }
  assert.equal(
    new URL(navigation.consoleHref(true, 'en')).pathname,
    '/dashboard'
  );
});

test('explicit protocol support overrides model names and handles multiple protocols', () => {
  const custom = {
    id: 'custom-gpt',
    protocols: ['anthropic-messages', 'openai-responses']
  };
  assert.equal(models.modelMatchesApp(custom, 'claude'), true);
  assert.equal(models.modelMatchesApp(custom, 'codex'), true);
  assert.equal(models.modelMatchesApp(custom, 'gemini'), false);
  assert.equal(
    models.modelMatchesApp({ id: 'claude-sonnet', protocols: [] }, 'claude'),
    false
  );
});

test('legacy suggestions exclude mismatched clients, legacy chat and non-chat models', () => {
  const list = models.parseClientModels([
    'claude-sonnet-4-5',
    'gpt-5',
    'gpt-4',
    'gpt-image-1',
    'gpt-4o-audio',
    'gemini-2.5-pro',
    'gemini-2.5-flash-image',
    'custom-model'
  ]);
  assert.deepEqual(
    list.filter((m) => models.modelMatchesApp(m, 'claude')).map((m) => m.id),
    ['claude-sonnet-4-5']
  );
  assert.deepEqual(
    list.filter((m) => models.modelMatchesApp(m, 'codex')).map((m) => m.id),
    ['gpt-5']
  );
  assert.deepEqual(
    list.filter((m) => models.modelMatchesApp(m, 'gemini')).map((m) => m.id),
    ['gemini-2.5-pro']
  );
  assert.equal(models.setupSelection(list, 'gpt-5').app, 'codex');
  assert.equal(models.setupSelection(list, 'custom-model').target, 'manual');
  assert.equal(
    models.setupSelection(list, 'custom-model').model,
    'custom-model'
  );
});

test('model payload handles legacy names, protocol metadata, duplicates and invalid entries', () => {
  assert.deepEqual(
    models.parseClientModels([
      'x',
      null,
      'x',
      { id: 'y', protocols: ['gemini', 'invalid'] }
    ]),
    [{ id: 'x' }, { id: 'y', protocols: ['gemini'] }]
  );
  assert.throws(() => models.parseClientModels({}));
});

test('language preference prioritizes explicit links and shared cookies, with blocked storage fallback', () => {
  const source = ts.transpileModule(
    readFileSync(join(__dirname, '../lib/locale-preference.ts'), 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020
      }
    }
  ).outputText;
  const context = {
    exports: {},
    URLSearchParams,
    window: {
      location: {
        search: '?lang=zh',
        hostname: 'platform.linkinfra.ai',
        protocol: 'https:'
      }
    },
    document: {
      cookie: 'linkinfra-locale=en',
      documentElement: { lang: 'en' }
    },
    localStorage: {
      getItem: () => 'zh',
      setItem: () => {
        throw new Error('blocked');
      }
    }
  };
  vm.runInNewContext(source, context);
  assert.equal(context.exports.readLanguage(), 'zh');
  context.window.location.search = '';
  assert.equal(context.exports.readLanguage(), 'en');
  context.exports.saveLanguage('zh');
  assert.match(context.document.cookie, /Domain=linkinfra.ai/);
  assert.match(context.document.cookie, /; Secure/);
  assert.equal(context.document.documentElement.lang, 'zh-CN');
  context.window.location.hostname = 'notlinkinfra.ai';
  context.exports.saveLanguage('en');
  assert.doesNotMatch(context.document.cookie, /Domain=/);
  context.document.cookie = '';
  context.localStorage.getItem = () => {
    throw new Error('blocked');
  };
  assert.equal(context.exports.readLanguage(), 'en');
});
