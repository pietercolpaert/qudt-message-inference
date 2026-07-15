import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import test from 'node:test';
import {
  collectMessages,
  CDT,
  CDT_QUANTITY_DATATYPE_NAMES,
  loadQuads,
  loadRdfMessageLog,
  parseQuads,
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

const v4DatatypeCases = [
  ['ucum', 'm'],
  ['acceleration', 'm/s2'],
  ['amountOfSubstance', 'mol'],
  ['angle', 'rad'],
  ['area', 'm2'],
  ['catalyticActivity', 'kat'],
  ['dimensionless', '%'],
  ['electricCapacitance', 'F'],
  ['electricCharge', 'C'],
  ['electricConductance', 'S'],
  ['electricCurrent', 'A'],
  ['electricInductance', 'H'],
  ['electricPotential', 'V'],
  ['electricResistance', 'Ohm'],
  ['energy', 'J'],
  ['force', 'N'],
  ['frequency', 'Hz'],
  ['illuminance', 'lx'],
  ['length', 'm'],
  ['luminousFlux', 'lm'],
  ['luminousIntensity', 'cd'],
  ['magneticFlux', 'Wb'],
  ['magneticFluxDensity', 'T'],
  ['mass', 'kg'],
  ['power', 'W'],
  ['pressure', 'Pa'],
  ['radiationDoseAbsorbed', 'Gy'],
  ['radiationDoseEffective', 'Sv'],
  ['radioactivity', 'Bq'],
  ['solidAngle', 'sr'],
  ['speed', 'm/s'],
  ['temperature', 'K'],
  ['time', 's'],
  ['volume', 'm3'],
] as const;

const datatypeNamespaces = [
  ['v4', 'https://w3id.org/cdt/'],
  ['legacy', 'http://w3id.org/lindt/custom_datatypes#'],
] as const;

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

test('the supported vocabulary contains every CDT v4 UCUM quantity-value datatype', () => {
  assert.deepEqual(
    v4DatatypeCases.map(([name]) => name),
    [...CDT_QUANTITY_DATATYPE_NAMES],
  );
  assert.equal(CDT.supported.size, v4DatatypeCases.length * 2);
  for (const [name] of v4DatatypeCases) {
    assert.ok(CDT.supported.has(`https://w3id.org/cdt/${name}`));
    assert.ok(CDT.supported.has(`http://w3id.org/lindt/custom_datatypes#${name}`));
  }
  assert.equal(CDT.supported.has('https://w3id.org/cdt/ucumunit'), false);
});

async function assertDatatypeConversion(
  datatypeIri: string,
  datatypeName: string,
  ucumCode: string,
): Promise<void> {
  const unitIri = `https://example.org/unit/${datatypeName}`;
  const dimensionIri = `https://example.org/dimension/${datatypeName}`;
  const syntheticBackground = parseQuads(`
    @prefix qudt: <http://qudt.org/schema/qudt/> .
    @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

    <${unitIri}> a qudt:Unit ;
      qudt:conversionMultiplier "1"^^xsd:decimal ;
      qudt:hasDimensionVector <${dimensionIri}> ;
      qudt:ucumCode "${ucumCode}"^^qudt:UCUMcs .
  `);
  const shaclIn = parseQuads(`
    @prefix ex: <https://example.org/> .
    @prefix sh: <http://www.w3.org/ns/shacl#> .

    ex:InputShape a sh:NodeShape ;
      sh:targetClass ex:Observation ;
      sh:property [
        sh:path ex:value ;
        sh:datatype <${datatypeIri}> ;
        sh:unit <${unitIri}>
      ] .
  `);
  const outputShape = parseQuads(`
    @prefix ex: <https://example.org/> .
    @prefix qudt: <http://qudt.org/schema/qudt/> .
    @prefix sh: <http://www.w3.org/ns/shacl#> .
    @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

    ex:OutputShape a sh:NodeShape ;
      sh:targetClass ex:Observation ;
      sh:property [ sh:path ex:normalizedQuantity ; sh:node ex:OutputQuantityShape ] .
    ex:OutputQuantityShape a sh:NodeShape ;
      sh:property [
        sh:path qudt:numericValue ;
        sh:datatype xsd:decimal ;
        sh:unit <${unitIri}>
      ] ;
      sh:property [ sh:path qudt:unit ; sh:hasValue <${unitIri}> ] .
  `);
  const messages = parseRdfMessageLog(`
    @prefix ex: <https://example.org/> .
    ex:observation a ex:Observation ;
      ex:value "2.5 ${ucumCode}"^^<${datatypeIri}> .
  `);
  const engine = new QudtMessageInferenceEngine({
    shaclIn,
    backgroundKnowledge: syntheticBackground,
  });
  const inferred = await collectMessages(engine.infer(outputShape, messages));

  assert.deepEqual(inferred[0].diagnostics, []);
  assert.equal(inferred[0].conversions.length, 1);
  assert.equal(inferred[0].conversions[0].sourceUnit, unitIri);
  assert.equal(inferred[0].conversions[0].sourceValue, 2.5);
  assert.equal(inferred[0].conversions[0].targetValue, 2.5);
}

for (const [namespaceLabel, datatypeNamespace] of datatypeNamespaces) {
  for (const [datatypeName, ucumCode] of v4DatatypeCases) {
    test(`${namespaceLabel} cdt:${datatypeName}: parses a representative UCUM literal`, () =>
      assertDatatypeConversion(
        `${datatypeNamespace}${datatypeName}`,
        datatypeName,
        ucumCode,
      ));
  }
}
