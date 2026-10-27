const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function load(file, dependencies = {}) {
  const compiled = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, '..', file), 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020
      }
    }
  );
  const exports = {};
  new Function('require', 'exports', compiled.outputText)(
    (name) => dependencies[name] || require(name),
    exports
  );
  return exports;
}
const playground = load('lib/playground.ts');
const client = load('lib/client-setup.ts');
const input = {
  model: 'gpt-image-1',
  prompt: 'A blue bird',
  size: 'auto',
  quality: 'auto',
  output_format: 'png',
  n: 1
};
const png =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=';

function imageRoute(session = { user: { id: 'test-user' } }) {
  return load('app/api/playground/images/route.ts', {
    '@/auth': { auth: async () => session },
    '@/lib/playground': playground,
    '@/lib/client-setup': client
  });
}
function request(body, headers = { 'Content-Type': 'application/json' }) {
  return new Request('http://localhost/api/playground/images', {
    method: 'POST',
    headers,
    body:
      typeof body === 'string' || body instanceof FormData
        ? body
        : JSON.stringify(body)
  });
}

test('image results render Base64, URL and revised prompts, without accepting unsafe URLs', () => {
  const content = playground.normalizeImageResponse(
    {
      data: [
        { b64_json: png },
        {
          url: 'https://example.com/image.png',
          revised_prompt: 'A revised bird'
        },
        { url: 'javascript:alert(1)' }
      ]
    },
    'webp'
  );
  assert.deepEqual(playground.getImageUrls(content), [
    `data:image/webp;base64,${png}`,
    'https://example.com/image.png'
  ]);
  assert.equal(playground.getTextContent(content), 'A revised bird');
  assert.throws(
    () =>
      playground.normalizeImageResponse({
        error: { message: 'Quota exceeded' }
      }),
    /Quota exceeded/
  );
  for (const data of [
    null,
    {},
    { data: [] },
    { data: [{ url: 'javascript:alert(1)' }] }
  ]) {
    assert.throws(() => playground.normalizeImageResponse(data), /No images/);
  }
  assert.equal(playground.isGptImageModel('openai/gpt-image-1.5'), true);
  assert.equal(playground.isGptImageModel('gpt-4.1'), false);
});

test('generation JSON excludes chat parameters and GPT Image response_format', async () => {
  const result = await playground.buildImageRequest(
    { ...input, messages: [], temperature: 1, response_format: 'b64_json' },
    'sk-test',
    [],
    new AbortController().signal
  );
  assert.equal(result.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(result.body), { ...input, apiKey: 'sk-test' });
});

test('reference images become multipart file uploads with no manual Content-Type', async () => {
  const result = await playground.buildImageRequest(
    input,
    'sk-test',
    [`data:image/png;base64,${png}`],
    new AbortController().signal
  );
  assert.equal(result.headers, undefined);
  assert.equal(result.body.get('model'), 'gpt-image-1');
  assert.equal(result.body.getAll('image[]').length, 1);
  assert.equal(result.body.get('image[]').type, 'image/png');
  assert.equal(
    result.body.get('image[]').size,
    Buffer.from(png, 'base64').length
  );
  await assert.rejects(
    playground.buildImageRequest(
      input,
      'sk-test',
      ['data:image/gif;base64,R0lGODlh'],
      new AbortController().signal
    ),
    /PNG, JPEG and WebP/
  );
});

test('generation proxy requires authentication, validates input and forwards only API parameters', async (t) => {
  t.mock.method(global, 'fetch', async (url, init) => {
    assert.equal(url, 'https://gateway.example/proxy/v1/images/generations');
    assert.equal(init.headers.Authorization, 'Bearer sk-test-only');
    assert.equal(init.headers['Content-Type'], 'application/json');
    assert.deepEqual(JSON.parse(init.body), input);
    assert.equal(init.cache, 'no-store');
    assert.ok(init.signal instanceof AbortSignal);
    return Response.json({ data: [{ b64_json: png }] });
  });
  const before = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = 'https://gateway.example/proxy/v1/';
  t.after(() => {
    if (before === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = before;
  });
  assert.equal(
    (await imageRoute(null).POST(request({ ...input, apiKey: 'test-only' })))
      .status,
    401
  );
  for (const invalid of [
    { ...input, apiKey: '' },
    { ...input, apiKey: 'test', prompt: '' },
    { ...input, apiKey: 'test', n: 10 },
    { ...input, apiKey: 'test', size: 'bad-size' }
  ]) {
    assert.equal((await imageRoute().POST(request(invalid))).status, 400);
  }
  assert.equal((await imageRoute().POST(request('invalid-json'))).status, 400);
  assert.equal(fetch.mock.calls.length, 0);
  const result = await imageRoute().POST(
    request({
      ...input,
      apiKey: 'test-only',
      messages: [],
      response_format: 'url'
    })
  );
  assert.equal(result.status, 200);
  assert.equal(result.headers.get('cache-control'), 'no-store');
  assert.equal((await result.json()).data[0].b64_json, png);
});

test('edit proxy forwards image[] files and strips API key from multipart payload', async (t) => {
  const before = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = 'https://gateway.example';
  t.after(() => {
    if (before === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = before;
  });
  t.mock.method(global, 'fetch', async (url, init) => {
    assert.equal(url, 'https://gateway.example/v1/images/edits');
    assert.equal(init.headers['Content-Type'], undefined);
    assert.equal(init.body.has('apiKey'), false);
    assert.equal(init.body.getAll('image[]').length, 2);
    assert.equal(init.body.get('prompt'), input.prompt);
    return Response.json(
      { error: { message: 'Model unavailable' } },
      { status: 403 }
    );
  });
  const form = new FormData();
  Object.entries({ ...input, apiKey: 'test' }).forEach(([key, value]) =>
    form.set(key, String(value))
  );
  form.append(
    'image[]',
    new Blob([Buffer.from(png, 'base64')], { type: 'image/png' }),
    'first.png'
  );
  form.append(
    'image[]',
    new Blob([Buffer.from(png, 'base64')], { type: 'image/png' }),
    'second.png'
  );
  const result = await imageRoute().POST(request(form, {}));
  assert.equal(result.status, 403);
  assert.equal((await result.json()).error.message, 'Model unavailable');
  form.set('image[]', 'https://untrusted.example/test.png');
  assert.equal((await imageRoute().POST(request(form, {}))).status, 400);
  assert.equal(fetch.mock.calls.length, 1);
});

test('chat handles fragmented UTF-8 SSE, final lines without newlines, and JSON fallback', async () => {
  const raw =
    'data:{"choices":[{"delta":{"content":"你好"}}]}\r\n\r\ndata: {"choices":[{"delta":{"content":"!"}}]}';
  const bytes = new TextEncoder().encode(raw);
  const stream = new ReadableStream({
    start(controller) {
      for (let i = 0; i < bytes.length; i += 3)
        controller.enqueue(bytes.slice(i, i + 3));
      controller.close();
    }
  });
  let text = '';
  await playground.readChatResponse(
    new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } }),
    (delta) => {
      text += delta;
    }
  );
  assert.equal(text, '你好!');
  text = '';
  await playground.readChatResponse(
    Response.json({
      choices: [{ message: { content: 'Non-streamed reply' } }]
    }),
    (delta) => {
      text += delta;
    }
  );
  assert.equal(text, 'Non-streamed reply');
  await assert.rejects(
    playground.readChatResponse(
      new Response('data: {"error":{"message":"Quota exceeded"}}\n', {
        headers: { 'Content-Type': 'text/event-stream' }
      }),
      () => {}
    ),
    /Quota exceeded/
  );
});

test('chat completes at [DONE] even if the gateway keeps the connection open', async () => {
  let cancelled = false;
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        new TextEncoder().encode(
          'data: {"choices":[{"delta":{"content":"Done"}}]}\n\ndata: [DONE]\n\n'
        )
      );
    },
    cancel() {
      cancelled = true;
    }
  });
  let text = '';
  await playground.readChatResponse(
    new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } }),
    (delta) => {
      text += delta;
    }
  );
  assert.equal(text, 'Done');
  assert.equal(cancelled, true);
});

test('cancelled edit preparation never starts an upstream image request', async (t) => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    playground.buildImageRequest(
      input,
      'sk-test',
      [`data:image/png;base64,${png}`],
      controller.signal
    ),
    { name: 'AbortError' }
  );
});

test('image proxy preserves cancellation and reports transport failures without leaking keys', async (t) => {
  const before = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.NEXT_PUBLIC_API_BASE_URL = 'https://gateway.example';
  t.after(() => {
    if (before === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = before;
  });
  t.mock.method(global, 'fetch', async () => {
    throw new Error('private transport detail');
  });
  const failed = await imageRoute().POST(
    request({ ...input, apiKey: 'test-only' })
  );
  assert.equal(failed.status, 502);
  assert.deepEqual(await failed.json(), {
    error: 'Unable to reach the image service.'
  });
  const controller = new AbortController();
  const cancelled = new Request('http://localhost/api/playground/images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...input, apiKey: 'test-only' }),
    signal: controller.signal
  });
  controller.abort();
  assert.equal((await imageRoute().POST(cancelled)).status, 499);
});
