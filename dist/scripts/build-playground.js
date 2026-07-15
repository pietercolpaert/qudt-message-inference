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
const units = new qudt_index_1.QudtUnitIndex((0, rdf_1.loadQuads)((0, node_path_1.join)(root, 'background', 'qudt-mini.ttl')));
const cases = corpus.dimensions.flatMap((dimension) => {
    const manifest = JSON.parse((0, node_fs_1.readFileSync)((0, node_path_1.join)(fixtureRoot, 'manifests', `${dimension.name}.json`), 'utf8'));
    if (manifest.caseCount !== manifest.cases.length) {
        throw new Error(`${dimension.name} manifest case count does not match its cases.`);
    }
    return manifest.cases.map((testCase, index) => {
        const source = units.require(testCase.sourceUnit);
        const target = units.require(testCase.targetUnit);
        if (source.dimensionVector !== target.dimensionVector) {
            throw new Error(`${testCase.sourceUnit} cannot be converted to ${testCase.targetUnit}.`);
        }
        return {
            id: `${dimension.name}-${String(index + 1).padStart(2, '0')}`,
            dimension: dimension.name,
            dimensionLabel: dimensionLabels[dimension.name] ?? dimension.name,
            observation: testCase.observation,
            sourceValue: testCase.sourceValue,
            expectedValue: testCase.expectedValue,
            source: {
                iri: source.iri,
                symbol: source.symbol ?? source.iri.split('/').pop() ?? source.iri,
                multiplier: source.multiplier,
                offset: source.offset,
            },
            target: {
                iri: target.iri,
                symbol: target.symbol ?? target.iri.split('/').pop() ?? target.iri,
                multiplier: target.multiplier,
                offset: target.offset,
            },
        };
    });
});
if (cases.length !== corpus.totalMessages) {
    throw new Error(`Built ${cases.length} playground cases; expected ${corpus.totalMessages}.`);
}
(0, node_fs_1.mkdirSync)(destinationRoot, { recursive: true });
for (const file of ['index.html', 'app.js', 'styles.css', '.nojekyll']) {
    (0, node_fs_1.copyFileSync)((0, node_path_1.join)(sourceRoot, file), (0, node_path_1.join)(destinationRoot, file));
}
(0, node_fs_1.writeFileSync)((0, node_path_1.join)(destinationRoot, 'cases.js'), `window.QUDT_PLAYGROUND_DATA = ${JSON.stringify({
    totalUnits: corpus.totalUnits,
    totalCases: cases.length,
    dimensions: corpus.dimensions.length,
    cases,
}, null, 2)};\n`);
//# sourceMappingURL=build-playground.js.map