const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(file) {
  const compiled = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, '..', file), 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020
      }
    }
  ).outputText;
  const result = {};
  new Function('exports', compiled)(result);
  return result;
}
const { createSystemConfigStore } = load('lib/system-config.ts');
const { apiAddresses } = load('lib/client-setup.ts');
const response = (address = 'https://api.linkinfra.ai') => ({
  ok: true,
  json: async () => ({
    success: true,
    data: {
      server_address: address,
      system_name: 'LinkInfra',
      docs_address: 'https://old-docs.example.com'
    }
  })
});

test('transient failure is not cached and a later consumer recovers its endpoint', async () => {
  let calls = 0;
  const store = createSystemConfigStore(async () => {
    if (++calls === 1) throw new Error('network');
    return response();
  });
  await store.load();
  assert(store.getSnapshot().error);
  assert.equal(store.getSnapshot().serverAddress, '');
  const seenA = [],
    seenB = [];
  const stopA = store.subscribe(() => seenA.push(store.getSnapshot()));
  const stopB = store.subscribe(() => seenB.push(store.getSnapshot()));
  await store.load();
  assert.equal(calls, 2);
  assert.equal(store.getSnapshot().error, null);
  assert.equal(
    apiAddresses(store.getSnapshot().serverAddress).root,
    'https://api.linkinfra.ai'
  );
  assert.equal(
    apiAddresses(store.getSnapshot().serverAddress).openai,
    'https://api.linkinfra.ai/v1'
  );
  assert.equal(seenA.at(-1), seenB.at(-1));
  assert.equal(store.getSnapshot().docsAddress, '/docs');
  stopA();
  stopB();
});

test('concurrent consumers share one request and forced refresh updates mounted consumers', async () => {
  let calls = 0;
  let address = 'https://api.example.com/gateway/v1/';
  const store = createSystemConfigStore(async (_url, options) => {
    calls++;
    assert.equal(options.cache, 'no-store');
    return response(address);
  });
  await Promise.all([store.load(), store.load(), store.load()]);
  assert.equal(calls, 1);
  await store.load();
  assert.equal(calls, 1);
  address = 'https://new-api.example.com';
  await store.load(true);
  assert.equal(calls, 2);
  assert.equal(store.getSnapshot().serverAddress, address);
});

test('save refresh waits for an older in-flight request and then reads the new address', async () => {
  let complete;
  let calls = 0;
  const store = createSystemConfigStore(async () =>
    ++calls === 1
      ? new Promise((resolve) => {
          complete = resolve;
        })
      : response('https://updated.example.com')
  );
  const older = store.load();
  await Promise.resolve();
  const newer = store.load(true);
  complete(response('https://old.example.com'));
  await Promise.all([older, newer]);
  assert.equal(calls, 2);
  assert.equal(
    store.getSnapshot().serverAddress,
    'https://updated.example.com'
  );
});

test('HTTP, business and malformed responses remain retryable; an empty saved address is distinct', async () => {
  for (const invalid of [
    { ok: false },
    { ok: true, json: async () => ({ success: false }) },
    { ok: true, json: async () => ({ success: true, data: {} }) },
    {
      ok: true,
      json: async () => {
        throw new Error('invalid JSON');
      }
    }
  ]) {
    let fail = true;
    const store = createSystemConfigStore(async () =>
      fail ? invalid : response('')
    );
    await store.load();
    assert(store.getSnapshot().error);
    assert.equal(store.getSnapshot().loading, false);
    fail = false;
    await store.load();
    assert.equal(store.getSnapshot().error, null);
    assert.equal(store.getSnapshot().serverAddress, '');
  }
});
