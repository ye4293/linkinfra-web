const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const compiled = ts.transpileModule(
  fs.readFileSync(path.join(__dirname, '../lib/client-setup.ts'), 'utf8'),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }
);
const client = {};
new Function('exports', compiled.outputText)(client);
const setup = {
  serverAddress: 'https://api.example.com/gateway/v1/',
  apiKey: 'test-only+&=/秘密',
  name: 'LinkInfra · 测试 & app',
  model: 'provider/model+a&b'
};

test('CC Switch receives exact credentials and protocol-specific endpoints', () => {
  for (const app of ['claude', 'codex', 'gemini']) {
    const url = new URL(
      client.buildClientImport(app, { ...setup, haikuModel: 'small & fast' })
    );
    assert.equal(url.protocol, 'ccswitch:');
    assert.equal(url.hostname, 'v1');
    assert.equal(url.pathname, '/import');
    assert.equal(url.searchParams.get('resource'), 'provider');
    assert.equal(url.searchParams.get('apiKey'), 'sk-' + setup.apiKey);
    assert.equal(url.searchParams.get('name'), setup.name);
    assert.equal(url.searchParams.get('model'), setup.model);
    assert.equal(
      url.searchParams.get('endpoint'),
      'https://api.example.com/gateway' + (app === 'codex' ? '/v1' : '')
    );
    assert.equal(
      url.searchParams.get('haikuModel'),
      app === 'claude' ? 'small & fast' : null
    );
    assert.equal(url.searchParams.has('enabled'), false);
  }
});

test('Cherry Studio payload decodes with its documented base64 protocol', () => {
  const url = new URL(
    client.buildClientImport('cherry', { ...setup, apiKey: 'sk-test-only' })
  );
  assert.equal(url.protocol, 'cherrystudio:');
  assert.equal(url.hostname, 'providers');
  assert.equal(url.pathname, '/api-keys');
  assert.equal(url.searchParams.get('v'), '1');
  const params = new URLSearchParams(
    url.search.replaceAll('+', '_').replaceAll('/', '-')
  );
  const data = JSON.parse(
    Buffer.from(
      params.get('data').replaceAll('_', '+').replaceAll('-', '/'),
      'base64'
    ).toString('utf8')
  );
  assert.deepEqual(data, {
    id: 'linkinfra',
    name: setup.name,
    type: 'openai',
    baseUrl: 'https://api.example.com/gateway/v1',
    apiKey: 'sk-test-only'
  });
});

test('address normalization keeps reverse proxy paths and avoids duplicate v1', () => {
  for (const suffix of ['', '/', '/v1', '/v1/']) {
    assert.deepEqual(
      client.apiAddresses('https://api.example.com/gateway' + suffix),
      {
        root: 'https://api.example.com/gateway',
        openai: 'https://api.example.com/gateway/v1'
      }
    );
  }
});

test('invalid hosts, missing keys and required model fields cannot generate imports', () => {
  for (const address of [
    '',
    '/relative',
    'javascript:alert(1)',
    'ftp://example.com',
    'https://user:pass@example.com',
    'https://example.com?key=x',
    'https://example.com#frag'
  ]) {
    assert.throws(() =>
      client.buildClientImport('cherry', { ...setup, serverAddress: address })
    );
  }
  for (const apiKey of ['', 'sk-***', '••••••', 'bad key'])
    assert.throws(() =>
      client.buildClientImport('cherry', { ...setup, apiKey })
    );
  assert.throws(() =>
    client.buildClientImport('claude', { ...setup, model: '' })
  );
  assert.throws(() =>
    client.buildClientImport('claude', { ...setup, name: ' ' })
  );
  assert.equal(
    client.clientApiKey(' sk-already-prefixed '),
    'sk-already-prefixed'
  );
});
