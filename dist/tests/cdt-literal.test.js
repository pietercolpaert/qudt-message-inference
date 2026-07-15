"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_test_1 = __importDefault(require("node:test"));
const src_1 = require("../src");
const root = (0, node_path_1.resolve)(__dirname, '../..');
const fixtures = (0, node_path_1.join)(root, 'tests', 'fixtures');
const background = (0, src_1.loadQuads)((0, node_path_1.join)(root, 'background', 'qudt-mini.ttl'));
const shaclOut = (0, src_1.loadQuads)((0, node_path_1.join)(fixtures, 'shapes', 'speed-out.ttl'));
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
];
const datatypeNamespaces = [
    ['v4', 'https://w3id.org/cdt/'],
    ['legacy', 'http://w3id.org/lindt/custom_datatypes#'],
];
function closeEnough(actual, expected) {
    const tolerance = Math.max(1e-10, Math.abs(expected) * 1e-10);
    return Math.abs(actual - expected) <= tolerance;
}
for (const fixtureName of ['cdt-speed', 'cdt-ucum']) {
    (0, node_test_1.default)(`${fixtureName}: parses UCUM codes from typed literals in N3`, async () => {
        const manifest = JSON.parse((0, node_fs_1.readFileSync)((0, node_path_1.join)(fixtures, 'manifests', `${fixtureName}.json`), 'utf8'));
        const engine = new src_1.QudtMessageInferenceEngine({
            shaclIn: (0, src_1.loadQuads)((0, node_path_1.join)(fixtures, 'shapes', `${fixtureName}-in.ttl`)),
            backgroundKnowledge: background,
        });
        const compiled = engine.compile(shaclOut);
        const inferred = await (0, src_1.collectMessages)(engine.infer(shaclOut, (0, src_1.loadRdfMessageLog)((0, node_path_1.join)(fixtures, 'logs', `${fixtureName}.trig`))));
        strict_1.default.equal(engine.getPlanSummary().inputRepresentation, 'cdt-literal');
        strict_1.default.equal(engine.getPlanSummary().numericValuePath, undefined);
        strict_1.default.match(compiled.program, /string:scrape/);
        strict_1.default.match(compiled.program, /dt:lexicalForm/);
        strict_1.default.match(compiled.program, /recognizedUcumCode/);
        strict_1.default.equal(inferred.length, manifest.caseCount);
        inferred.forEach((message, index) => {
            const expected = manifest.cases[index];
            strict_1.default.deepEqual(message.diagnostics, []);
            strict_1.default.equal(message.conversions.length, 1);
            const conversion = message.conversions[0];
            strict_1.default.equal(conversion.root.value, expected.observation);
            strict_1.default.equal(conversion.sourceUnit, expected.sourceUnit);
            strict_1.default.equal(conversion.targetUnit, expected.targetUnit);
            strict_1.default.ok(closeEnough(conversion.sourceValue, Number(expected.sourceValue)));
            strict_1.default.ok(closeEnough(conversion.targetValue, Number(expected.expectedValue)));
            strict_1.default.ok(message.quads.some((quad) => quad.object.termType === 'Literal' &&
                quad.object.datatype.value === expected.datatype &&
                quad.object.value === `${expected.sourceValue} ${expected.ucumCode}`), 'the original full CDT literal should remain in the inferred RDF Message');
        });
    });
}
(0, node_test_1.default)('a malformed or unmapped CDT lexical form produces a diagnostic', async () => {
    const engine = new src_1.QudtMessageInferenceEngine({
        shaclIn: (0, src_1.loadQuads)((0, node_path_1.join)(fixtures, 'shapes', 'cdt-speed-in.ttl')),
        backgroundKnowledge: background,
    });
    const messages = (0, src_1.parseRdfMessageLog)(`
    @prefix cdt: <http://w3id.org/lindt/custom_datatypes#> .
    @prefix ex: <https://example.org/> .
    ex:bad a ex:Observation ; ex:speed "fast furlong/fortnight"^^cdt:speed .
  `);
    const inferred = await (0, src_1.collectMessages)(engine.infer(shaclOut, messages));
    strict_1.default.equal(inferred[0].conversions.length, 0);
    strict_1.default.equal(inferred[0].diagnostics[0]?.code, 'INVALID_CDT_LITERAL');
});
(0, node_test_1.default)('the supported vocabulary contains every CDT v4 UCUM quantity-value datatype', () => {
    strict_1.default.deepEqual(v4DatatypeCases.map(([name]) => name), [...src_1.CDT_QUANTITY_DATATYPE_NAMES]);
    strict_1.default.equal(src_1.CDT.supported.size, v4DatatypeCases.length * 2);
    for (const [name] of v4DatatypeCases) {
        strict_1.default.ok(src_1.CDT.supported.has(`https://w3id.org/cdt/${name}`));
        strict_1.default.ok(src_1.CDT.supported.has(`http://w3id.org/lindt/custom_datatypes#${name}`));
    }
    strict_1.default.equal(src_1.CDT.supported.has('https://w3id.org/cdt/ucumunit'), false);
});
async function assertDatatypeConversion(datatypeIri, datatypeName, ucumCode) {
    const unitIri = `https://example.org/unit/${datatypeName}`;
    const dimensionIri = `https://example.org/dimension/${datatypeName}`;
    const syntheticBackground = (0, src_1.parseQuads)(`
    @prefix qudt: <http://qudt.org/schema/qudt/> .
    @prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

    <${unitIri}> a qudt:Unit ;
      qudt:conversionMultiplier "1"^^xsd:decimal ;
      qudt:hasDimensionVector <${dimensionIri}> ;
      qudt:ucumCode "${ucumCode}"^^qudt:UCUMcs .
  `);
    const shaclIn = (0, src_1.parseQuads)(`
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
    const outputShape = (0, src_1.parseQuads)(`
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
    const messages = (0, src_1.parseRdfMessageLog)(`
    @prefix ex: <https://example.org/> .
    ex:observation a ex:Observation ;
      ex:value "2.5 ${ucumCode}"^^<${datatypeIri}> .
  `);
    const engine = new src_1.QudtMessageInferenceEngine({
        shaclIn,
        backgroundKnowledge: syntheticBackground,
    });
    const inferred = await (0, src_1.collectMessages)(engine.infer(outputShape, messages));
    strict_1.default.deepEqual(inferred[0].diagnostics, []);
    strict_1.default.equal(inferred[0].conversions.length, 1);
    strict_1.default.equal(inferred[0].conversions[0].sourceUnit, unitIri);
    strict_1.default.equal(inferred[0].conversions[0].sourceValue, 2.5);
    strict_1.default.equal(inferred[0].conversions[0].targetValue, 2.5);
}
for (const [namespaceLabel, datatypeNamespace] of datatypeNamespaces) {
    for (const [datatypeName, ucumCode] of v4DatatypeCases) {
        (0, node_test_1.default)(`${namespaceLabel} cdt:${datatypeName}: parses a representative UCUM literal`, () => assertDatatypeConversion(`${datatypeNamespace}${datatypeName}`, datatypeName, ucumCode));
    }
}
//# sourceMappingURL=cdt-literal.test.js.map