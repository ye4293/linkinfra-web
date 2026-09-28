const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const ts = require('typescript');
const compiled = ts.transpileModule(
  readFileSync(join(__dirname, '../lib/date-time-range.ts'), 'utf8'),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }
);
const helpers = {};
new Function('exports', compiled.outputText)(helpers);
const { presetRange, validDateRange, rangeFromTimestamps } = helpers;

test('last 7 and 30 days include today, crossing months and leap days', () => {
  const now = new Date(2024, 2, 1, 12);
  const week = presetRange('week', now);
  const month = presetRange('month', now);
  assert.equal(week.from.getDate(), 24);
  assert.equal(week.from.getMonth(), 1);
  assert.equal(month.from.getDate(), 1);
  assert.equal(month.from.getMonth(), 1);
  assert.equal(week.from.getHours(), 0);
  assert.equal(week.to.getDate(), 1);
  assert.equal(week.to.getHours(), 23);
  assert.equal(week.to.getSeconds(), 59);
  assert.equal(now.getHours(), 12);
});

test('calendar week starts Monday even on Sunday and yesterday crosses year', () => {
  assert.equal(
    presetRange('thisWeek', new Date(2026, 8, 27)).from.getDate(),
    21
  );
  const yesterday = presetRange('yesterday', new Date(2026, 0, 1));
  assert.equal(yesterday.from.getFullYear(), 2025);
  assert.equal(yesterday.from.getMonth(), 11);
  assert.equal(yesterday.from.getDate(), 31);
  assert.equal(yesterday.to.getDate(), 31);
});

test('incomplete, invalid and reversed ranges cannot be applied; equal timestamps can', () => {
  assert.equal(validDateRange({ from: undefined, to: new Date() }), false);
  assert.equal(
    validDateRange({ from: new Date('invalid'), to: new Date() }),
    false
  );
  assert.equal(
    validDateRange({ from: new Date(2000), to: new Date(1000) }),
    false
  );
  assert.equal(
    validDateRange({ from: new Date(1000), to: new Date(1000) }),
    true
  );
});

test('URL timestamps restore exact seconds and keep explicit all-time filters empty', () => {
  assert.deepEqual(rangeFromTimestamps('', ''), {
    from: undefined,
    to: undefined
  });
  assert.equal(rangeFromTimestamps('12345', '12399').from.getTime(), 12345000);
  assert.equal(rangeFromTimestamps('0', '1').from.getTime(), 0);
  assert.deepEqual(rangeFromTimestamps('invalid', 'Infinity'), {
    from: undefined,
    to: undefined
  });
});
