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

function automaticEngine(): QudtMessageInferenceEngine {
  return new QudtMessageInferenceEngine({ backgroundKnowledge: background });
}

test('SHACL IN is optional and leaves the complete QUDT index available', () => {
  const summary = automaticEngine().getPlanSummary();
  assert.equal(summary.inputRepresentation, 'auto');
  assert.equal(summary.totalQudtUnits, 73);
  assert.equal(summary.retainedQudtUnits, 73);
  assert.equal(summary.sourceUnits.length, 73);
  assert.equal(summary.quantityPath, undefined);
  assert.equal(summary.numericValuePath, 'http://qudt.org/schema/qudt/numericValue');
  assert.equal(summary.unitPath, 'http://qudt.org/schema/qudt/unit');
});

test('automatic input discovery converts standard nested QUDT quantities', async () => {
  const message = loadRdfMessageLog(join(fixtures, 'logs', 'length.trig'))[2];
  const output = automaticEngine().infer(
    loadQuads(join(fixtures, 'shapes', 'length-out.ttl')),
    [message],
  );
  const first = await output.next();
  assert.equal(first.done, false);
  if (first.done) return;
  assert.deepEqual(first.value.diagnostics, []);
  assert.equal(first.value.conversions.length, 1);
  assert.equal(first.value.conversions[0].targetValue, 2.5);
});

test('automatic input discovery converts direct CDT literals', async () => {
  const message = loadRdfMessageLog(join(fixtures, 'logs', 'cdt-speed.trig'))[0];
  const output = automaticEngine().infer(
    loadQuads(join(fixtures, 'shapes', 'speed-out.ttl')),
    [message],
  );
  const first = await output.next();
  assert.equal(first.done, false);
  if (first.done) return;
  assert.deepEqual(first.value.diagnostics, []);
  assert.equal(first.value.conversions.length, 1);
  assert.ok(Math.abs(first.value.conversions[0].targetValue - 43.2) < 1e-10);
});

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
