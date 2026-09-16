const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const compiled = ts.transpileModule(
  fs.readFileSync(path.join(__dirname, '../lib/audio-billing.ts'), 'utf8'),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }
).outputText;
const billing = {};
new Function('exports', compiled)(billing);

test('duration UI renders minute prices and quota without inventing token charges', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const locale = { lang: 'en' };
  function load(file, modules) {
    const code = ts.transpileModule(
      fs.readFileSync(path.join(__dirname, '..', file), 'utf8'),
      {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2020,
          jsx: ts.JsxEmit.ReactJSX
        }
      }
    ).outputText;
    const exports = {};
    new Function('exports', 'require', code)(
      exports,
      (name) => modules[name] || require(name)
    );
    return exports;
  }
  const catalog = load('components/landing/catalog.ts', {});
  const modules = {
    '@/components/providers/locale-provider': { useLocale: () => locale },
    '@/components/landing/catalog': catalog,
    '@/lib/audio-billing': billing
  };
  modules['@/components/duration-price'] = load(
    'components/duration-price.tsx',
    modules
  );
  const { DurationPrice } = modules['@/components/duration-price'];
  const { DurationBilling } = load(
    'sections/log/duration-billing.tsx',
    modules
  );
  assert.match(
    renderToStaticMarkup(React.createElement(DurationPrice, { value: 0.0045 })),
    /\$0\.0045.*min/
  );
  assert.match(
    renderToStaticMarkup(React.createElement(DurationPrice, { value: 0 })),
    /\$0.*min/
  );
  const other = {
    billing_mode: 'duration',
    audio_duration_seconds: 9,
    duration_price_per_minute: 0.0045,
    group_ratio: 1,
    transcription_usage_source: 'upstream'
  };
  const html = renderToStaticMarkup(
    React.createElement(DurationBilling, { other, quota: 338 })
  );
  assert.match(html, /9 seconds/);
  assert.match(html, /338.*quota/);
  assert.doesNotMatch(html, /million|tokens ×/);
  const missing = renderToStaticMarkup(
    React.createElement(DurationBilling, {
      other: {
        ...other,
        audio_duration_seconds: undefined,
        transcription_usage_source: 'missing'
      },
      quota: 0
    })
  );
  assert.match(missing, /No valid duration/);
  assert.doesNotMatch(missing, /0 seconds/);
  locale.lang = 'zh';
  assert.match(
    renderToStaticMarkup(React.createElement(DurationPrice, { value: 0.0045 })),
    /分钟/
  );
});
test('audio log preserves zero duration/free pricing and does not coerce missing usage to zero', () => {
  assert.deepEqual(
    billing.parseAudioBilling({
      billing_mode: 'duration',
      audio_duration_seconds: 0,
      duration_price_per_minute: 0,
      group_ratio: 0,
      transcription_usage_source: 'upstream'
    }),
    { seconds: 0, price: 0, ratio: 0, source: 'upstream' }
  );
  for (const value of [undefined, null, -1, Infinity, '60']) {
    assert.equal(
      billing.parseAudioBilling({
        billing_mode: 'duration',
        audio_duration_seconds: value
      }).seconds,
      null
    );
  }
  assert.equal(
    billing.parseAudioBilling({
      billing_mode: 'duration',
      duration_price_per_minute: 0.0045
    }).source,
    'missing'
  );
  assert.equal(billing.parseAudioBilling({ billing_type: 'token' }), null);
  assert.equal(billing.parseAudioBilling(null), null);
});
