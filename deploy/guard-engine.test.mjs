import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkExport, draftHeaderContract } from './pages/guard-engine.js';

const contract = readFileSync(new URL('../cellar.json', import.meta.url), 'utf8');
const fixture = name => readFileSync(new URL('./pages/samples/' + name, import.meta.url), 'utf8');
const findings = report => report.results.flatMap(result => result.issues.map(({ code, record }) => [code, record]));

test('browser and Java sample reports agree on verdicts and findings', () => {
  for (const name of ['passing', 'breaking', 'fixed']) {
    const browser = checkExport(contract, fixture(name + '.csv'));
    const java = JSON.parse(fixture(name + '.json'));
    assert.equal(browser.passed, java.passed);
    assert.equal(browser.blocking, java.blocking);
    assert.equal(browser.rowsChecked, java.rowsChecked);
    assert.deepEqual(findings(browser), findings(java));
  }
});

test('combined keys and exact decimal bounds detect findings without including cell values', () => {
  const custom = '{"integrations":[{"id":"Orders","required":["order","sku","amount"],' +
    '"uniqueKeys":[["order","sku"]],"rules":{"amount":{"type":"decimal","min":9007199254740993}}}]}';
  const csv = 'order,sku,amount\r\nPRIVATE-KEY,"item,1",9007199254740993\r\nPRIVATE-KEY,"item,1",9007199254740992\r\nA,,9007199254740993';
  const report = checkExport(custom, csv);
  assert.equal(report.blocking, true);
  assert.deepEqual(findings(report), [['BELOW_MIN', 3], ['DUPLICATE_KEY', 3], ['EMPTY_KEY', 4]]);
  assert.ok(!JSON.stringify(report).includes('PRIVATE-KEY'));
});

test('structure checking catches truncated rows and malformed CSV quoting', () => {
  const headerOnly = '{"integrations":[{"id":"a","required":["id","name"]}]}';
  const strict = headerOnly.replace('{', '{"validateRows":true,');
  assert.equal(checkExport(headerOnly, 'id,name\n1').rowsChecked, null);
  assert.throws(() => checkExport(strict, 'id,name\n1'), /record 2/);
  assert.throws(() => checkExport(strict, 'id,name\n1,"open'), /Unclosed quote/);
  assert.throws(() => checkExport(strict, 'id,id\n1,2'), /duplicate header/);
  assert.equal(checkExport(strict, 'id,name\n1,"two\nlines"').rowsChecked, 1);
});

test('invalid bounds and duplicate JSON keys fail closed', () => {
  assert.throws(() => checkExport('{"validateRows":true,"validateRows":false,"integrations":[]}', 'a'), /duplicate property/);
  const fakeBound = '{"integrations":[{"id":"a","required":["x"],"rules":{"x":{"type":"integer","min":{"source":"0"}}}}]}';
  assert.throws(() => checkExport(fakeBound, 'x\n1'), /JSON number/);
});

test('starter contracts keep headers and enforce row structure without collecting values', () => {
  const source = draftHeaderContract('id;"item;name"\n1;private-data', ';');
  const draft = JSON.parse(source);
  assert.equal(draft.delimiter, ';');
  assert.deepEqual(draft.integrations[0].required, ['id', 'item;name']);
  assert.equal(draft.validateRows, true);
  assert.ok(!source.includes('private-data'));
  assert.equal(checkExport(source, 'id;"item;name"\n2;next').passed, true);
  assert.throws(() => draftHeaderContract('id;item\n1', ';'), /column count/);
});
