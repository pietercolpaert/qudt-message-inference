import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import test from 'node:test';
import type { Quad } from '@rdfjs/types';
import { reasonRdfJs } from 'eyeling';
import { loadRdfMessageLog, QCR } from '../src';

const root = resolve(__dirname, '../..');

test('the generated combined N3 background can be imported directly by Eyeling', async () => {
  const background = readFileSync(
    join(root, 'background', 'qudt-conversion-background.n3'),
    'utf8',
  );
  const trigger = `
@prefix ex:   <https://example.org/> .
@prefix qudt: <http://qudt.org/schema/qudt/> .
@prefix unit: <http://qudt.org/vocab/unit/> .
@prefix qcr:  <https://w3id.org/qudt-inference#> .

{
  ?root ex:quantity ?quantity .
  ?quantity qudt:numericValue ?value ; qudt:unit ?unit .
  (?value ?unit unit:M) qcr:convertedValue ?converted .
}
=>
{
  ?quantity qcr:convertedNumericValue ?converted .
} .
`;
  const message = loadRdfMessageLog(
    join(root, 'tests', 'fixtures', 'logs', 'length.trig'),
  )[2];
  const inferred: Quad[] = [];
  for await (const quad of reasonRdfJs({ quads: message, n3: `${background}\n${trigger}` })) {
    if (quad.predicate.value === QCR.convertedNumericValue) inferred.push(quad as Quad);
  }
  assert.equal(inferred.length, 1);
  assert.equal(Number(inferred[0].object.value), 2.5);
});
