import assert from 'node:assert/strict';
import { join, resolve } from 'node:path';
import test from 'node:test';
import {
  IncompatibleDimensionError,
  loadQuads,
  loadRdfMessageLog,
  QudtMessageInferenceEngine,
} from '../src';

const root = resolve(__dirname, '../..');
const fixtures = join(root, 'tests', 'fixtures');
const background = loadQuads(join(root, 'background', 'qudt-mini.ttl'));

function lengthEngine(): QudtMessageInferenceEngine {
  return new QudtMessageInferenceEngine({
    shaclIn: loadQuads(join(fixtures, 'shapes', 'length-in.ttl')),
    backgroundKnowledge: background,
  });
}

test('SHACL IN prunes the QUDT index to reachable dimensions', () => {
  const summary = lengthEngine().getPlanSummary();
  assert.equal(summary.totalQudtUnits, 73);
  assert.equal(summary.retainedQudtUnits, 10);
  assert.equal(summary.retainedDimensions.length, 1);
  assert.equal(summary.sourceUnits.length, 10);
});

test('compiled Eyeling program contains only target-compatible source units', () => {
  const compiled = lengthEngine().compile(
    loadQuads(join(fixtures, 'shapes', 'length-out.ttl')),
  );
  assert.equal(compiled.compatibleSourceUnits.length, 10);
  assert.match(compiled.program, /http:\/\/qudt\.org\/vocab\/unit\/CentiM/);
  assert.doesNotMatch(compiled.program, /http:\/\/qudt\.org\/vocab\/unit\/SEC>/);
});

test('a dimensionally incompatible SHACL OUT is rejected before streaming starts', () => {
  assert.throws(
    () =>
      lengthEngine().compile(
        loadQuads(join(fixtures, 'shapes', 'time-out.ttl')),
      ),
    IncompatibleDimensionError,
  );
});

test('a source unit outside the SHACL IN contract is not converted', async () => {
  const engine = lengthEngine();
  const timeMessage = loadRdfMessageLog(join(fixtures, 'logs', 'time.trig'))[0];
  const output = engine.infer(
    loadQuads(join(fixtures, 'shapes', 'length-out.ttl')),
    [timeMessage],
  );
  const first = await output.next();
  assert.equal(first.done, false);
  if (first.done) return;
  assert.equal(first.value.conversions.length, 0);
  assert.equal(first.value.diagnostics[0]?.code, 'SOURCE_UNIT_NOT_ALLOWED');
});
