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
  );
  const exports = {};
  new Function('require', 'exports', compiled.outputText)(require, exports);
  return exports;
}

const routing = load('lib/provider-routing.ts');

const sources = [
  {
    name: 'anthropic',
    display_name: 'Anthropic',
    models: ['claude-a', 'claude-b', 'claude-direct-only']
  },
  { name: 'vertex', display_name: 'vertex', models: ['claude-a', 'claude-b'] },
  { name: 'aws', display_name: 'AWS', models: ['claude-a', 'claude-aws-only'] }
];
const empty = routing.EMPTY_PROVIDER_ROUTING;

test('reads routing from an API response', () => {
  assert.deepEqual(routing.readProviderRouting(undefined), empty);
  assert.deepEqual(routing.readProviderRouting(null), empty);
  assert.deepEqual(routing.readProviderRouting('vertex'), empty);
  assert.deepEqual(
    routing.readProviderRouting({ order: null, only: false, ignore: null }),
    empty
  );
  assert.deepEqual(
    routing.readProviderRouting({
      order: [' Vertex ', 'anthropic', 'vertex', 3, ''],
      only: true,
      ignore: ['AWS']
    }),
    { order: ['vertex', 'anthropic'], only: true, ignore: ['aws'] }
  );
  // The backend rejects these combinations; a response that has them is repaired instead of resubmitted.
  assert.deepEqual(
    routing.readProviderRouting({
      order: ['vertex'],
      ignore: ['vertex', 'aws']
    }),
    { order: ['vertex'], only: false, ignore: ['aws'] }
  );
  assert.deepEqual(
    routing.readProviderRouting({ order: [], only: true, ignore: [] }),
    empty
  );
  assert.equal(routing.isProviderRoutingEmpty(empty), true);
  assert.equal(
    routing.isProviderRoutingEmpty({ order: [], only: false, ignore: ['aws'] }),
    false
  );
});

test('ignore wins over the selection, and only restricts to it', () => {
  const allowed = (value, name) => routing.providerAllowed(value, name);
  assert.equal(allowed(empty, 'aws'), true);
  const ordered = { order: ['vertex'], only: false, ignore: ['aws'] };
  assert.equal(allowed(ordered, 'vertex'), true);
  assert.equal(allowed(ordered, 'anthropic'), true);
  assert.equal(allowed(ordered, 'aws'), false);
  const only = { order: ['vertex'], only: true, ignore: [] };
  assert.equal(allowed(only, 'vertex'), true);
  assert.equal(allowed(only, 'anthropic'), false);
});

test('editing keeps the routing in a shape the backend accepts', () => {
  let value = routing.selectProvider(empty, 'vertex');
  value = routing.selectProvider(value, 'anthropic');
  value = routing.selectProvider(value, 'vertex');
  assert.deepEqual(value.order, ['vertex', 'anthropic']);

  // "Only selected" cannot be on without a selection.
  assert.equal(routing.setOnlySelected(empty, true).only, false);
  value = routing.setOnlySelected(value, true);
  assert.equal(value.only, true);

  // Ignoring a selected provider removes it from the selection.
  value = routing.toggleIgnoredProvider(value, 'anthropic');
  assert.deepEqual(value, {
    order: ['vertex'],
    only: true,
    ignore: ['anthropic']
  });
  // Selecting an ignored provider removes it from the ignore list.
  value = routing.selectProvider(value, 'anthropic');
  assert.deepEqual(value, {
    order: ['vertex', 'anthropic'],
    only: true,
    ignore: []
  });

  value = routing.reorderProviders(value, ['anthropic', 'vertex']);
  assert.deepEqual(value.order, ['anthropic', 'vertex']);
  assert.equal(value.only, true);

  // Removing the last selected provider turns "only selected" off.
  value = routing.deselectProvider(value, 'anthropic');
  assert.equal(value.only, true);
  value = routing.deselectProvider(value, 'vertex');
  assert.deepEqual(value, empty);

  // The ignore list is kept sorted, and a second toggle removes the entry.
  value = routing.toggleIgnoredProvider(empty, 'vertex');
  value = routing.toggleIgnoredProvider(value, 'aws');
  assert.deepEqual(value.ignore, ['aws', 'vertex']);
  value = routing.toggleIgnoredProvider(value, 'vertex');
  assert.deepEqual(value.ignore, ['aws']);
  // Ignoring the only selected provider also turns "only selected" off.
  value = routing.toggleIgnoredProvider(
    { order: ['vertex'], only: true, ignore: [] },
    'vertex'
  );
  assert.deepEqual(value, { order: [], only: false, ignore: ['vertex'] });

  // Helpers never mutate their input.
  assert.deepEqual(empty, { order: [], only: false, ignore: [] });
});

test('lists the models a routing makes unavailable', () => {
  assert.deepEqual(routing.unavailableModels(sources, empty), []);
  // Other providers still back up the selection while "only" is off.
  assert.deepEqual(
    routing.unavailableModels(sources, {
      order: ['vertex'],
      only: false,
      ignore: []
    }),
    []
  );
  assert.deepEqual(
    routing.unavailableModels(sources, {
      order: ['vertex'],
      only: true,
      ignore: []
    }),
    ['claude-aws-only', 'claude-direct-only']
  );
  assert.deepEqual(
    routing.unavailableModels(sources, {
      order: [],
      only: false,
      ignore: ['aws']
    }),
    ['claude-aws-only']
  );
  assert.deepEqual(
    routing.unavailableModels(sources, {
      order: ['vertex', 'aws'],
      only: true,
      ignore: []
    }),
    ['claude-direct-only']
  );

  const none = {
    order: [],
    only: false,
    ignore: ['anthropic', 'aws', 'vertex']
  };
  assert.deepEqual(routing.usableSources(sources, none), []);
  assert.equal(routing.unavailableModels(sources, none).length, 4);
  assert.deepEqual(
    routing.usableSources(sources, { order: ['aws'], only: true, ignore: [] }),
    [sources[2]]
  );
});

test('flags providers the account cannot use right now', () => {
  assert.deepEqual(routing.unknownProviders(sources, empty), []);
  assert.deepEqual(
    routing.unknownProviders(sources, {
      order: ['vertex', 'openrouter'],
      only: false,
      ignore: ['azure', 'aws']
    }),
    ['azure', 'openrouter']
  );
  // A selection made only of missing providers leaves nothing usable when "only" is on.
  assert.deepEqual(
    routing.usableSources(sources, {
      order: ['openrouter'],
      only: true,
      ignore: []
    }),
    []
  );
});
