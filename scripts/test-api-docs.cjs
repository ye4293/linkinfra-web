const assert = require('node:assert/strict');
const { readFileSync, mkdtempSync, writeFileSync, rmSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { createServer } = require('node:http');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { test } = require('node:test');
const ts = require('typescript');

// 使用项目现有 TypeScript 编译器加载纯函数，无需额外测试依赖。
function load(relative) {
  const source = readFileSync(join(__dirname, relative), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  });
  const result = {};
  new Function('exports', compiled.outputText)(result);
  return result;
}

const { apiDocs, resolveApiRoot } = load('../lib/api-docs/catalog.ts');
const { requestExample, examplePath, docMarkdown } = load(
  '../lib/api-docs/examples.ts'
);
const { docsHref } = load('../lib/public-navigation.ts');
const run = promisify(execFile);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

test('请求地址规范化并拒绝无效地址，文档默认入口保留外部配置', () => {
  assert.equal(
    resolveApiRoot('https://api.example.com/v1/'),
    'https://api.example.com'
  );
  assert.equal(
    resolveApiRoot('https://api.example.com/gateway/v1'),
    'https://api.example.com/gateway'
  );
  for (const value of [
    '',
    '/v1',
    'javascript:alert(1)',
    'https://user:pass@host.com',
    'https://host.com/?key=secret'
  ]) {
    assert.equal(resolveApiRoot(value), null);
  }
  assert.equal(docsHref(''), '/docs');
  assert.equal(docsHref('javascript:alert(1)'), '/docs');
  assert.equal(
    docsHref('https://docs.example.com'),
    'https://docs.example.com'
  );
});

test('JavaScript 示例生成正确的 JSON、文件上传和音频保存请求', async (t) => {
  for (const doc of apiDocs) {
    await t.test(doc.slug, async () => {
      let captured;
      let saved;
      const source = requestExample(
        doc,
        'https://api.example.com',
        'JavaScript'
      ).replace(/^import .*;\n/gm, '');
      const execute = new AsyncFunction(
        'fetch',
        'process',
        'console',
        'openAsBlob',
        'writeFile',
        source
      );
      await execute(
        async (url, options) => {
          captured = { url, ...options };
          return {
            ok: true,
            json: async () => ({ success: true }),
            arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer
          };
        },
        { env: { LINKINFRA_API_KEY: 'sk-test-only' } },
        { log() {} },
        async () => new Blob(['audio fixture']),
        async (file, data) => {
          saved = { file, data };
        }
      );
      assert.equal(captured.url, `https://api.example.com${examplePath(doc)}`);
      assert.equal(captured.method, doc.method);
      assert.equal(captured.headers.Authorization, 'Bearer sk-test-only');
      for (const [key, value] of Object.entries(doc.headers || {}))
        assert.equal(captured.headers[key], value);
      if (doc.multipart) {
        assert.equal(captured.headers['Content-Type'], undefined);
        assert.equal(captured.body.get('model'), doc.body.model);
        assert.equal(await captured.body.get('file').text(), 'audio fixture');
      } else if (doc.body) {
        assert.deepEqual(JSON.parse(captured.body), doc.body);
        assert.equal(captured.headers['Content-Type'], 'application/json');
      } else {
        assert.equal(captured.body, undefined);
      }
      if (doc.binary) {
        assert.equal(saved.file, 'speech.mp3');
        assert.deepEqual([...saved.data], [1, 2, 3]);
      }
    });
  }
});

test('JavaScript 示例保留失败响应信息', async () => {
  const source = requestExample(
    apiDocs[0],
    'https://api.example.com',
    'JavaScript'
  );
  const execute = new AsyncFunction('fetch', 'process', source);
  await assert.rejects(
    execute(async () => ({ ok: false, text: async () => 'invalid_api_key' }), {
      env: { LINKINFRA_API_KEY: 'sk-test-only' }
    }),
    /invalid_api_key/
  );
});

test('cURL 示例实际发送正确请求，包含特殊字符和 multipart boundary', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'linkinfra-docs-test-'));
  writeFileSync(join(directory, 'audio.mp3'), 'audio fixture');
  let captured;
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    captured = {
      method: req.method,
      path: req.url,
      headers: req.headers,
      body: Buffer.concat(chunks).toString()
    };
    res.setHeader('Content-Type', 'application/json');
    res.end('{"ok":true}');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    rmSync(directory, { recursive: true, force: true });
  });
  const root = `http://127.0.0.1:${server.address().port}`;
  const special = {
    ...apiDocs[0],
    slug: 'special-characters',
    body: {
      model: 'test',
      messages: [
        {
          role: 'user',
          content: 'A user\'s text: `literal` $(literal) "quoted"\n新的一行'
        }
      ]
    }
  };
  for (const doc of [...apiDocs, special]) {
    await t.test(doc.slug, async () => {
      await run('bash', ['-c', requestExample(doc, root, 'cURL')], {
        cwd: directory,
        env: { ...process.env, LINKINFRA_API_KEY: 'sk-test-only' },
        timeout: 10000
      });
      assert.equal(captured.method, doc.method);
      assert.equal(captured.path, examplePath(doc));
      assert.equal(captured.headers.authorization, 'Bearer sk-test-only');
      if (doc.multipart) {
        assert.match(
          captured.headers['content-type'],
          /multipart\/form-data; boundary=/
        );
        assert.match(captured.body, /audio fixture/);
        assert.match(captured.body, /name="model"\r\n\r\nwhisper-1/);
      } else if (doc.body) {
        assert.deepEqual(JSON.parse(captured.body), doc.body);
      } else {
        assert.equal(captured.body, '');
      }
    });
  }
});

test('Markdown 文档包含实际鉴权请求头与请求格式', () => {
  const claude = apiDocs.find((doc) => doc.slug === 'api/messages');
  const result = docMarkdown(claude, 'https://api.example.com', 'zh');
  assert.match(result, /anthropic-version: 2023-06-01/);
  assert.match(result, /max_tokens/);
  assert.match(result, /身份验证/);
});
