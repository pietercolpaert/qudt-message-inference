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
//# sourceMappingURL=cdt-literal.test.js.map