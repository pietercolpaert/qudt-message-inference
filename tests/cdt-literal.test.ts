import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import test from 'node:test';
import {
  collectMessages,
  loadQuads,
  loadRdfMessageLog,
  parseRdfMessageLog,
  QudtMessageInferenceEngine,
} from '../src';

interface CdtTestCase {
  readonly observation: string;
  readonly sourceUnit: string;
  readonly targetUnit: string;
  readonly sourceValue: string;
  readonly expectedValue: string;
  readonly datatype: string;
  readonly property: string;
  readonly ucumCode: string;
}

interface CdtManifest {
  readonly caseCount: number;
  readonly cases: readonly CdtTestCase[];
}

const root = resolve(__dirname, '../..');
const fixtures = join(root, 'tests', 'fixtures');
const background = loadQuads(join(root, 'background', 'qudt-mini.ttl'));
const shaclOut = loadQuads(join(fixtures, 'shapes', 'speed-out.ttl'));

function closeEnough(actual: number, expected: number): boolean {
  const tolerance = Math.max(1e-10, Math.abs(expected) * 1e-10);
  return Math.abs(actual - expected) <= tolerance;
}

for (const fixtureName of ['cdt-speed', 'cdt-ucum'] as const) {
  test(`${fixtureName}: parses UCUM codes from typed literals in N3`, async () => {
    const manifest = JSON.parse(
      readFileSync(join(fixtures, 'manifests', `${fixtureName}.json`), 'utf8'),
    ) as CdtManifest;
    const engine = new QudtMessageInferenceEngine({
      shaclIn: loadQuads(join(fixtures, 'shapes', `${fixtureName}-in.ttl`)),
      backgroundKnowledge: background,
    });
    const compiled = engine.compile(shaclOut);
    const inferred = await collectMessages(
      engine.infer(shaclOut, loadRdfMessageLog(join(fixtures, 'logs', `${fixtureName}.trig`))),
    );

    assert.equal(engine.getPlanSummary().inputRepresentation, 'cdt-literal');
    assert.equal(engine.getPlanSummary().numericValuePath, undefined);
    assert.match(compiled.program, /string:scrape/);
    assert.match(compiled.program, /dt:lexicalForm/);
    assert.match(compiled.program, /recognizedUcumCode/);
    assert.equal(inferred.length, manifest.caseCount);

    inferred.forEach((message, index) => {
      const expected = manifest.cases[index];
      assert.deepEqual(message.diagnostics, []);
      assert.equal(message.conversions.length, 1);
      const conversion = message.conversions[0];
      assert.equal(conversion.root.value, expected.observation);
      assert.equal(conversion.sourceUnit, expected.sourceUnit);
      assert.equal(conversion.targetUnit, expected.targetUnit);
      assert.ok(closeEnough(conversion.sourceValue, Number(expected.sourceValue)));
      assert.ok(closeEnough(conversion.targetValue, Number(expected.expectedValue)));
      assert.ok(
        message.quads.some(
          (quad) =>
            quad.object.termType === 'Literal' &&
            quad.object.datatype.value === expected.datatype &&
            quad.object.value === `${expected.sourceValue} ${expected.ucumCode}`,
        ),
        'the original full CDT literal should remain in the inferred RDF Message',
      );
    });
  });
}

test('a malformed or unmapped CDT lexical form produces a diagnostic', async () => {
  const engine = new QudtMessageInferenceEngine({
    shaclIn: loadQuads(join(fixtures, 'shapes', 'cdt-speed-in.ttl')),
    backgroundKnowledge: background,
  });
  const messages = parseRdfMessageLog(`
    @prefix cdt: <http://w3id.org/lindt/custom_datatypes#> .
    @prefix ex: <https://example.org/> .
    ex:bad a ex:Observation ; ex:speed "fast furlong/fortnight"^^cdt:speed .
  `);
  const inferred = await collectMessages(engine.infer(shaclOut, messages));

  assert.equal(inferred[0].conversions.length, 0);
  assert.equal(inferred[0].diagnostics[0]?.code, 'INVALID_CDT_LITERAL');
});
