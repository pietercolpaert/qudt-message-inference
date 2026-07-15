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
const fixtureRoot = (0, node_path_1.join)(root, 'tests', 'fixtures');
const background = (0, src_1.loadQuads)((0, node_path_1.join)(root, 'background', 'qudt-mini.ttl'));
const corpus = JSON.parse((0, node_fs_1.readFileSync)((0, node_path_1.join)(fixtureRoot, 'manifests', 'all.json'), 'utf8'));
function closeEnough(actual, expected) {
    const tolerance = Math.max(1e-10, Math.abs(expected) * 1e-10);
    return Math.abs(actual - expected) <= tolerance;
}
for (const dimension of corpus.dimensions) {
    (0, node_test_1.default)(`${dimension.name}: normalizes ${dimension.messages} RDF Messages`, async () => {
        const shaclIn = (0, src_1.loadQuads)((0, node_path_1.join)(fixtureRoot, 'shapes', `${dimension.name}-in.ttl`));
        const shaclOut = (0, src_1.loadQuads)((0, node_path_1.join)(fixtureRoot, 'shapes', `${dimension.name}-out.ttl`));
        const messages = (0, src_1.loadRdfMessageLog)((0, node_path_1.join)(fixtureRoot, 'logs', `${dimension.name}.trig`));
        const manifest = JSON.parse((0, node_fs_1.readFileSync)((0, node_path_1.join)(fixtureRoot, 'manifests', `${dimension.name}.json`), 'utf8'));
        const engine = new src_1.QudtMessageInferenceEngine({
            shaclIn,
            backgroundKnowledge: background,
        });
        const inferred = await (0, src_1.collectMessages)(engine.infer(shaclOut, messages));
        strict_1.default.equal(messages.length, manifest.caseCount);
        strict_1.default.equal(inferred.length, manifest.caseCount);
        inferred.forEach((message, index) => {
            const expected = manifest.cases[index];
            strict_1.default.deepEqual(message.diagnostics, []);
            strict_1.default.equal(message.conversions.length, 1);
            const conversion = message.conversions[0];
            strict_1.default.equal(conversion.root.value, expected.observation);
            strict_1.default.equal(conversion.sourceUnit, expected.sourceUnit);
            strict_1.default.equal(conversion.targetUnit, expected.targetUnit);
            strict_1.default.ok(closeEnough(conversion.targetValue, Number(expected.expectedValue)), `${dimension.name} case ${index + 1}: ${conversion.targetValue} != ${expected.expectedValue}`);
        });
    });
}
(0, node_test_1.default)('the corpus exercises all curated units', () => {
    strict_1.default.equal(corpus.totalMessages, 73);
    strict_1.default.equal(corpus.totalUnits, 73);
    strict_1.default.equal(corpus.dimensions.length, 13);
    strict_1.default.equal(background.filter((quad) => quad.predicate.value.endsWith('conversionMultiplier')).length, 73);
});
//# sourceMappingURL=qudt-conversion.test.js.map