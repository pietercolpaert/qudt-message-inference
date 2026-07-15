import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import test from 'node:test';

interface PlaygroundCase {
  readonly id: string;
  readonly dimension: string;
  readonly representation: 'qudt-quantity' | 'cdt-literal';
  readonly inputRdf: string;
  readonly sourceValue: string;
  readonly expectedValue: string;
  readonly source: { readonly multiplier: number; readonly offset: number };
  readonly target: { readonly multiplier: number; readonly offset: number };
}

interface PlaygroundData {
  readonly totalCases: number;
  readonly totalUnits: number;
  readonly structuredCases: number;
  readonly literalCases: number;
  readonly dimensions: number;
  readonly cases: readonly PlaygroundCase[];
}

function closeEnough(actual: number, expected: number): boolean {
  const tolerance = Math.max(1e-10, Math.abs(expected) * 1e-10);
  return Math.abs(actual - expected) <= tolerance;
}

test('the generated browser playground contains and converts the full corpus', () => {
  const root = resolve(__dirname, '../..');
  const source = readFileSync(join(root, 'dist', 'playground', 'cases.js'), 'utf8');
  const match = /^window\.QUDT_PLAYGROUND_DATA = ([\s\S]+);\n$/.exec(source);
  assert.ok(match, 'cases.js should assign generated JSON to the browser data global');
  const data = JSON.parse(match[1]) as PlaygroundData;

  assert.equal(data.totalCases, 78);
  assert.equal(data.totalUnits, 73);
  assert.equal(data.structuredCases, 73);
  assert.equal(data.literalCases, 5);
  assert.equal(data.dimensions, 13);
  assert.equal(data.cases.length, data.totalCases);
  assert.equal(new Set(data.cases.map((item) => item.id)).size, data.totalCases);
  assert.equal(new Set(data.cases.map((item) => item.dimension)).size, data.dimensions);
  assert.equal(
    data.cases.filter((item) => item.representation === 'cdt-literal').length,
    data.literalCases,
  );
  assert.ok(data.cases.every((item) => item.inputRdf.includes(item.sourceValue)));
  assert.ok(
    data.cases.some(
      (item) =>
        item.representation === 'cdt-literal' &&
        item.inputRdf.includes('http://w3id.org/lindt/custom_datatypes#speed'),
    ),
  );
  assert.ok(
    data.cases.some(
      (item) =>
        item.representation === 'cdt-literal' &&
        item.inputRdf.includes('https://w3id.org/cdt/ucum'),
    ),
  );

  for (const item of data.cases) {
    const canonical = (Number(item.sourceValue) + item.source.offset) * item.source.multiplier;
    const actual = canonical / item.target.multiplier - item.target.offset;
    assert.ok(closeEnough(actual, Number(item.expectedValue)), `${item.id} did not match its fixture`);
  }
});
