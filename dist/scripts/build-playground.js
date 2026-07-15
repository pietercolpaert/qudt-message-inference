"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const qudt_index_1 = require("../src/qudt-index");
const rdf_1 = require("../src/rdf");
const dimensionLabels = {
    acceleration: 'Acceleration',
    angle: 'Plane angle',
    area: 'Area',
    density: 'Density',
    energy: 'Energy',
    length: 'Length',
    mass: 'Mass',
    power: 'Power',
    pressure: 'Pressure',
    speed: 'Speed',
    temperature: 'Absolute temperature',
    time: 'Time',
    volume: 'Volume',
};
const root = (0, node_path_1.resolve)(__dirname, '../..');
const fixtureRoot = (0, node_path_1.join)(root, 'tests', 'fixtures');
const sourceRoot = (0, node_path_1.join)(root, 'playground');
const destinationRoot = (0, node_path_1.join)(root, 'dist', 'playground');
const corpus = JSON.parse((0, node_fs_1.readFileSync)((0, node_path_1.join)(fixtureRoot, 'manifests', 'all.json'), 'utf8'));
const unitIndex = new qudt_index_1.QudtUnitIndex((0, rdf_1.loadQuads)((0, node_path_1.join)(root, 'background', 'qudt-mini.ttl')));
function escapeTurtle(value) {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
function inputRdf(testCase) {
    if (testCase.datatype && testCase.property && testCase.ucumCode) {
        return `@prefix ex: <https://example.org/> .\n\n<${testCase.observation}>\n  a ex:Observation ;\n  <${testCase.property}> "${escapeTurtle(`${testCase.sourceValue} ${testCase.ucumCode}`)}"^^<${testCase.datatype}> .`;
    }
    return `@prefix ex:   <https://example.org/> .\n@prefix qudt: <http://qudt.org/schema/qudt/> .\n@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .\n\n<${testCase.observation}>\n  a ex:Observation ;\n  ex:quantity [\n    a qudt:QuantityValue ;\n    qudt:numericValue "${escapeTurtle(testCase.sourceValue)}"^^xsd:decimal ;\n    qudt:unit <${testCase.sourceUnit}>\n  ] .`;
}
function buildCase(testCase, id, dimension, dimensionLabel) {
    const source = unitIndex.require(testCase.sourceUnit);
    const target = unitIndex.require(testCase.targetUnit);
    if (source.dimensionVector !== target.dimensionVector) {
        throw new Error(`${testCase.sourceUnit} cannot be converted to ${testCase.targetUnit}.`);
    }
    const representation = testCase.datatype ? 'cdt-literal' : 'qudt-quantity';
    return {
        id,
        dimension,
        dimensionLabel,
        representation,
        observation: testCase.observation,
        sourceValue: testCase.sourceValue,
        expectedValue: testCase.expectedValue,
        datatype: testCase.datatype,
        property: testCase.property,
        ucumCode: testCase.ucumCode,
        inputRdf: inputRdf(testCase),
        source: {
            iri: source.iri,
            symbol: source.symbol ?? source.iri.split('/').pop() ?? source.iri,
            dimensionVector: source.dimensionVector,
            multiplier: source.multiplier,
            offset: source.offset,
            ucumCodes: source.ucumCodes,
        },
        target: {
            iri: target.iri,
            symbol: target.symbol ?? target.iri.split('/').pop() ?? target.iri,
            dimensionVector: target.dimensionVector,
            multiplier: target.multiplier,
            offset: target.offset,
            ucumCodes: target.ucumCodes,
        },
    };
}
const structuredCases = corpus.dimensions.flatMap((dimension) => {
    const manifest = JSON.parse((0, node_fs_1.readFileSync)((0, node_path_1.join)(fixtureRoot, 'manifests', `${dimension.name}.json`), 'utf8'));
    if (manifest.caseCount !== manifest.cases.length) {
        throw new Error(`${dimension.name} manifest case count does not match its cases.`);
    }
    return manifest.cases.map((testCase, index) => buildCase(testCase, `${dimension.name}-${String(index + 1).padStart(2, '0')}`, dimension.name, dimensionLabels[dimension.name] ?? dimension.name));
});
if (structuredCases.length !== corpus.totalMessages) {
    throw new Error(`Built ${structuredCases.length} structured playground cases; expected ${corpus.totalMessages}.`);
}
const literalCases = ['cdt-speed', 'cdt-ucum'].flatMap((fixtureName) => {
    const manifest = JSON.parse((0, node_fs_1.readFileSync)((0, node_path_1.join)(fixtureRoot, 'manifests', `${fixtureName}.json`), 'utf8'));
    if (manifest.caseCount !== manifest.cases.length) {
        throw new Error(`${fixtureName} manifest case count does not match its cases.`);
    }
    return manifest.cases.map((testCase, index) => buildCase(testCase, `${fixtureName}-${String(index + 1).padStart(2, '0')}`, 'speed', fixtureName === 'cdt-speed' ? 'Speed · cdt:speed literals' : 'Speed · cdt:ucum literals'));
});
const cases = [...structuredCases, ...literalCases];
const units = unitIndex.all().map((unit) => ({
    iri: unit.iri,
    symbol: unit.symbol ?? unit.iri.split('/').pop() ?? unit.iri,
    dimensionVector: unit.dimensionVector,
    multiplier: unit.multiplier,
    offset: unit.offset,
    ucumCodes: unit.ucumCodes,
}));
(0, node_fs_1.mkdirSync)(destinationRoot, { recursive: true });
for (const file of ['index.html', 'app.js', 'styles.css', '.nojekyll']) {
    (0, node_fs_1.copyFileSync)((0, node_path_1.join)(sourceRoot, file), (0, node_path_1.join)(destinationRoot, file));
}
(0, node_fs_1.writeFileSync)((0, node_path_1.join)(destinationRoot, 'cases.js'), `window.QUDT_PLAYGROUND_DATA = ${JSON.stringify({
    totalUnits: corpus.totalUnits,
    totalCases: cases.length,
    structuredCases: structuredCases.length,
    literalCases: literalCases.length,
    dimensions: corpus.dimensions.length,
    units,
    cases,
}, null, 2)};\n`);
//# sourceMappingURL=build-playground.js.map