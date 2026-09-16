const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(file, modules = {}) {
  const source = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, '..', file), 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX
      }
    }
  ).outputText;
  const result = {};
  new Function('exports', 'require', source)(
    result,
    (name) => modules[name] || require(name)
  );
  return result;
}
const api = load('lib/site-notice.ts');
test('announcement save only updates Notice and broadcasts after successful persistence', async () => {
  const previous = global.fetch,
    previousWindow = global.window;
  const events = [];
  global.window = { dispatchEvent: (event) => events.push(event.type) };
  try {
    global.fetch = async (url, options) => {
      assert.equal(url, '/api/option');
      assert.equal(options.method, 'PUT');
      assert.deepEqual(JSON.parse(options.body), {
        key: 'Notice',
        value: 'Scheduled maintenance\n维护通知'
      });
      return { ok: true, json: async () => ({ success: true }) };
    };
    await api.saveSiteNotice(' Scheduled maintenance\n维护通知 ');
    assert.deepEqual(events, [api.NOTICE_UPDATED_EVENT]);
    for (const result of [
      { ok: false, json: async () => ({ success: false }) },
      { ok: true, json: async () => ({ success: false }) }
    ]) {
      global.fetch = async () => result;
      await assert.rejects(api.saveSiteNotice('changed'));
    }
    assert.equal(events.length, 1);
    global.fetch = async (_url, options) => {
      assert.equal(JSON.parse(options.body).value, '');
      return { ok: true, json: async () => ({ success: true }) };
    };
    await api.saveSiteNotice('  ');
  } finally {
    global.fetch = previous;
    global.window = previousWindow;
  }
});
test('public announcement accepts empty text but rejects malformed and failed responses', async () => {
  const previous = global.fetch;
  try {
    for (const data of ['', null, '  Hello\nWorld  ']) {
      global.fetch = async (url, options) => {
        assert.equal(url, '/api/notice');
        assert.equal(options.cache, 'no-store');
        return { ok: true, json: async () => ({ success: true, data }) };
      };
      assert.equal(await api.readSiteNotice(), (data || '').trim());
    }
    for (const result of [
      { success: false, data: 'old' },
      { success: true, data: { text: 'unexpected' } }
    ]) {
      global.fetch = async () => ({ ok: true, json: async () => result });
      await assert.rejects(api.readSiteNotice());
    }
  } finally {
    global.fetch = previous;
  }
});
test('notice content hides empty notices and renders HTML as plain text', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const { NoticeContent } = load('components/site-notice.tsx', {
    '@/components/providers/locale-provider': {
      useLocale: () => ({ lang: 'zh' })
    },
    '@/lib/site-notice': api,
    '@/lib/utils': { cn: (...values) => values.filter(Boolean).join(' ') }
  });
  assert.equal(
    renderToStaticMarkup(React.createElement(NoticeContent, { content: ' ' })),
    ''
  );
  const html = renderToStaticMarkup(
    React.createElement(NoticeContent, {
      content: '<script>alert(1)</script>\n第二行'
    })
  );
  assert(!html.includes('<script>'));
  assert(html.includes('&lt;script&gt;'));
  assert(html.includes('第二行'));
  assert(html.includes('网站公告'));
});
