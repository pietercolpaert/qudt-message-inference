import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import test from 'node:test';
import {
  collectMessages,
  loadQuads,
  loadRdfMessageLog,
  QudtMessageInferenceEngine,
} from '../src';

interface TestCase {
  readonly observation: string;
  readonly sourceUnit: string;
  readonly targetUnit: string;
  readonly sourceValue: string;
  readonly expectedValue: string;
}

interface DimensionManifest {
  readonly dimension: string;
  readonly targetUnit: string;
  readonly caseCount: number;
  readonly cases: readonly TestCase[];
}

interface CorpusManifest {
  readonly dimensions: readonly {
    readonly name: string;
    readonly targetUnit: string;
    readonly messages: number;
  }[];
  readonly totalUnits: number;
  readonly totalMessages: number;
}

const root = resolve(__dirname, '../..');
const fixtureRoot = join(root, 'tests', 'fixtures');
const background = loadQuads(join(root, 'background', 'qudt-mini.ttl'));
const corpus = JSON.parse(
  readFileSync(join(fixtureRoot, 'manifests', 'all.json'), 'utf8'),
) as CorpusManifest;

function closeEnough(actual: number, expected: number): boolean {
  const tolerance = Math.max(1e-10, Math.abs(expected) * 1e-10);
  return Math.abs(actual - expected) <= tolerance;
}

for (const dimension of corpus.dimensions) {
  test(`${dimension.name}: normalizes ${dimension.messages} RDF Messages`, async () => {
    const shaclIn = loadQuads(join(fixtureRoot, 'shapes', `${dimension.name}-in.ttl`));
    const shaclOut = loadQuads(join(fixtureRoot, 'shapes', `${dimension.name}-out.ttl`));
    const messages = loadRdfMessageLog(
      join(fixtureRoot, 'logs', `${dimension.name}.trig`),
    );
    const manifest = JSON.parse(
      readFileSync(join(fixtureRoot, 'manifests', `${dimension.name}.json`), 'utf8'),
    ) as DimensionManifest;

    const engine = new QudtMessageInferenceEngine({
      shaclIn,
      backgroundKnowledge: background,
    });
    const inferred = await collectMessages(engine.infer(shaclOut, messages));

    assert.equal(messages.length, manifest.caseCount);
    assert.equal(inferred.length, manifest.caseCount);

    inferred.forEach((message, index) => {
      const expected = manifest.cases[index];
      assert.deepEqual(message.diagnostics, []);
      assert.equal(message.conversions.length, 1);
      const conversion = message.conversions[0];
      assert.equal(conversion.root.value, expected.observation);
      assert.equal(conversion.sourceUnit, expected.sourceUnit);
      assert.equal(conversion.targetUnit, expected.targetUnit);
      assert.ok(
        closeEnough(conversion.targetValue, Number(expected.expectedValue)),
        `${dimension.name} case ${index + 1}: ${conversion.targetValue} != ${expected.expectedValue}`,
      );
    });
  });
}

test('the corpus exercises all curated units', () => {
  assert.equal(corpus.totalMessages, 73);
  assert.equal(corpus.totalUnits, 73);
  assert.equal(corpus.dimensions.length, 13);
  assert.equal(background.filter((quad) => quad.predicate.value.endsWith('conversionMultiplier')).length, 73);
});
