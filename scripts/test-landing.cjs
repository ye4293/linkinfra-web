const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');

// The catalog helpers have only type imports; transpile with the project's own
// TypeScript version to run regression checks without another test dependency.
const source = readFileSync(
  join(__dirname, '../components/landing/catalog.ts'),
  'utf8'
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020
  }
});
const catalog = {};
new Function('exports', compiled.outputText)(catalog);

test('model discount preserves original prices and applies once across price types', () => {
  const item = {
    base_input_price: 5,
    base_output_price: 30,
    base_fixed_price: 0.1,
    base_duration_price_per_minute: 0.006,
    channel_discount: 1,
    model_discount: 0.53,
    group_prices: []
  };
  const prices = catalog.modelPrices(item, '');
  assert.equal(catalog.formatPrice(prices.input), '$2.65');
  assert.equal(catalog.formatPrice(prices.output), '$15.9');
  assert.equal(catalog.formatPrice(prices.fixed), '$0.053');
  assert.equal(catalog.formatPrice(prices.duration), '$0.00318');
  assert.equal(item.base_input_price, 5);
  item.group_prices = [
    {
      group_key: 'test',
      combined_discount: 0.4,
      final_input_price: 2,
      final_output_price: 12,
      final_fixed_price: 0.04,
      final_duration_price_per_minute: 0.0024
    }
  ];
  assert.equal(catalog.modelPrices(item, 'test').input, 2);
  assert.equal(catalog.modelPrices(item, 'test').discount, 0.4);
  assert.equal(
    catalog.modelPrices(
      { ...item, model_discount: undefined, group_prices: [] },
      ''
    ).input,
    5
  );
});

function model(model_name, overrides = {}) {
  return {
    model_name,
    provider: 'Anthropic',
    price_type: 'ratio',
    base_input_price: 5,
    base_output_price: 25,
    base_fixed_price: 0,
    channel_discount: 1,
    group_prices: [],
    ...overrides
  };
}

test('duration catalog accepts paid and zero tariffs and rejects missing minute prices', async () => {
  const previous = global.fetch;
  try {
    for (const amount of [0, 0.0045]) {
      const item = model('gpt-transcribe', {
        price_type: 'duration',
        base_duration_price_per_minute: amount
      });
      global.fetch = async () => ({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            models: [item],
            groups: [],
            providers: [],
            total: 1,
            page_size: 100
          }
        })
      });
      const result = await catalog.fetchCatalog(new AbortController().signal);
      assert.equal(result.models[0].base_duration_price_per_minute, amount);
    }
    for (const amount of [undefined, null, -1, '0.0045', Infinity]) {
      global.fetch = async () => ({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            models: [
              model('gpt-transcribe', {
                price_type: 'duration',
                base_duration_price_per_minute: amount
              })
            ],
            total: 1,
            page_size: 100
          }
        })
      });
      await assert.rejects(catalog.fetchCatalog(new AbortController().signal));
    }
  } finally {
    global.fetch = previous;
  }
});

test('model labels preserve version numbers and distinguish thinking variants', () => {
  assert.equal(catalog.modelTitle('deepseek-v3'), 'DeepSeek V3');
  assert.equal(catalog.modelTitle('deepseek-v3.2'), 'DeepSeek V3.2');
  assert.equal(catalog.modelTitle('claude-fable-5-1'), 'Claude Fable 5.1');
  assert.equal(catalog.modelTitle('claude-opus-5-5'), 'Claude Opus 5.5');
  assert.equal(
    catalog.modelTitle('global.anthropic.claude-haiku-4-5-20251001-v1:0'),
    'Claude Haiku 4.5'
  );
  assert.equal(
    catalog.modelTitle('claude-haiku-4-5-20251001-thinking'),
    'Claude Haiku 4.5 Thinking'
  );
});

test('search accepts displayed labels, exact IDs, and the visible provider alias', () => {
  assert.equal(
    catalog.matchesModel(model('claude-fable-5-1'), ' Claude Fable 5.1 '),
    true
  );
  assert.equal(
    catalog.matchesModel(model('claude-fable-5-1'), 'claude-fable-5-1'),
    true
  );
  assert.equal(
    catalog.matchesModel(model('glm-5.3', { provider: 'Zhipu' }), 'Z.ai'),
    true
  );
  assert.equal(
    catalog.matchesModel(
      model('deepseek-v3.2', { provider: 'DeepSeek' }),
      'DeepSeek V3.2'
    ),
    true
  );
  assert.equal(
    catalog.matchesModel(model('claude-fable-5-1'), 'unrelated'),
    false
  );
});

test('homepage features the newest direct Opus ahead of Fable', () => {
  const models = [
    model('claude-fable-5-1'),
    model('claude-opus-5-1'),
    model('global.anthropic.claude-opus-5-5'),
    model('claude-opus-5-5-thinking'),
    model('claude-opus-5-5')
  ];
  const featured = catalog.orderModels(models)[0];
  assert.equal(featured.model_name, 'claude-opus-5-5');
  assert.equal(catalog.modelDetailHref(featured), '/model-plaza/claude-opus-5-5');
});

test('numeric release ordering selects newer direct models without mutating input', () => {
  const models = [
    model('claude-fable-9'),
    model('global.anthropic.claude-fable-12'),
    model('claude-fable-12-thinking'),
    model('claude-fable-12')
  ];
  const original = [...models];
  assert.equal(catalog.orderModels(models)[0].model_name, 'claude-fable-12');
  assert.deepEqual(models, original);
});

test('zero and group prices are respected and invalid display prices are not shown as free', () => {
  const item = model('claude-fable-5-1', {
    group_prices: [
      {
        group_key: 'discount',
        final_input_price: 0,
        final_output_price: 12.5,
        final_fixed_price: 0.2
      }
    ]
  });
  assert.deepEqual(catalog.modelPrices(item, 'discount'), {
    input: 0,
    output: 12.5,
    fixed: 0.2,
    duration: undefined,
    discount: 1
  });
  assert.deepEqual(catalog.modelPrices(item, 'base'), {
    input: 5,
    output: 25,
    fixed: 0,
    duration: undefined,
    discount: 1
  });
  assert.equal(catalog.formatPrice(0), '$0');
  assert.equal(catalog.formatPrice(Infinity), '—');
  assert.equal(catalog.formatPrice(undefined), '—');
});

test('all catalog pages are loaded and repeated IDs are deduplicated', async (t) => {
  const pages = [];
  const controller = new AbortController();
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(options.signal, controller.signal);
    const page = Number(
      new URL(url, 'http://localhost').searchParams.get('page')
    );
    pages.push(page);
    return {
      ok: true,
      json: async () => ({
        success: true,
        data: {
          models:
            page === 1
              ? [model('claude-fable-9'), model('claude-fable-12')]
              : [model('claude-fable-12')],
          groups: [],
          providers: [],
          total: 3,
          page_size: 2
        }
      })
    };
  });
  const result = await catalog.fetchCatalog(controller.signal);
  assert.deepEqual(pages, [1, 2]);
  assert.equal(result.models.length, 2);
  assert.equal(result.models[0].model_name, 'claude-fable-12');
});

test('nullable empty collections are safe to render', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => ({
    ok: true,
    json: async () => ({
      success: true,
      data: {
        models: [],
        groups: null,
        providers: null,
        total: 0,
        page_size: 100
      }
    })
  }));
  const result = await catalog.fetchCatalog(new AbortController().signal);
  assert.deepEqual(result.groups, []);
  assert.deepEqual(result.providers, []);
});

test('same model from different channels keeps separate prices and detail links', async (t) => {
  const official = model('deepseek-v3.2', {
    channel_id: 1,
    provider: 'DeepSeek',
    channel_discount: 0.8
  });
  const qianfan = model('deepseek-v3.2', {
    channel_id: 2,
    provider: 'Baidu',
    channel_discount: 0.7
  });
  const secondOfficial = model('deepseek-v3.2', {
    channel_id: 3,
    provider: 'DeepSeek',
    channel_discount: 0.9
  });
  t.mock.method(globalThis, 'fetch', async (url) => ({
    ok: true,
    json: async () => ({
      success: true,
      data: {
        models:
          new URL(url, 'http://localhost').searchParams.get('page') === '1'
            ? [official, qianfan]
            : [qianfan, secondOfficial],
        groups: [],
        providers: [],
        total: 4,
        page_size: 2
      }
    })
  }));
  const result = await catalog.fetchCatalog(new AbortController().signal);
  assert.equal(result.models.length, 3);
  assert.equal(new Set(result.models.map(catalog.modelEntryKey)).size, 3);
  assert.deepEqual(
    result.models
      .map((m) => [m.channel_id, catalog.modelPrices(m, '').input])
      .sort(),
    [
      [1, 4],
      [2, 3.5],
      [3, 4.5]
    ]
  );
  assert.equal(
    catalog.modelDetailHref(qianfan),
    '/model-plaza/deepseek-v3.2?channel_id=2'
  );
  assert.equal(
    catalog.modelDetailHref(model('org/model')),
    '/model-plaza/org%2Fmodel'
  );
});

test('malformed catalog entries, prices and pagination use the error path', async (t) => {
  let data;
  t.mock.method(globalThis, 'fetch', async () => ({
    ok: true,
    json: async () => ({ success: true, data })
  }));
  for (const invalid of [
    { models: [null], total: 1 },
    { models: [model('bad-price', { base_input_price: 'free' })], total: 1 },
    { models: [], total: 0, page_size: 0 },
    { models: [], total: 0, providers: {} }
  ]) {
    data = invalid;
    await assert.rejects(
      catalog.fetchCatalog(new AbortController().signal),
      /Invalid catalog/
    );
  }
});
