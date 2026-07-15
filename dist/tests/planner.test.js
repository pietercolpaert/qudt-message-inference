"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_path_1 = require("node:path");
const node_test_1 = __importDefault(require("node:test"));
const src_1 = require("../src");
const root = (0, node_path_1.resolve)(__dirname, '../..');
const fixtures = (0, node_path_1.join)(root, 'tests', 'fixtures');
const background = (0, src_1.loadQuads)((0, node_path_1.join)(root, 'background', 'qudt-mini.ttl'));
function lengthEngine() {
    return new src_1.QudtMessageInferenceEngine({
        shaclIn: (0, src_1.loadQuads)((0, node_path_1.join)(fixtures, 'shapes', 'length-in.ttl')),
        backgroundKnowledge: background,
    });
}
function automaticEngine() {
    return new src_1.QudtMessageInferenceEngine({ backgroundKnowledge: background });
}
(0, node_test_1.default)('SHACL IN is optional and leaves the complete QUDT index available', () => {
    const summary = automaticEngine().getPlanSummary();
    strict_1.default.equal(summary.inputRepresentation, 'auto');
    strict_1.default.equal(summary.totalQudtUnits, 73);
    strict_1.default.equal(summary.retainedQudtUnits, 73);
    strict_1.default.equal(summary.sourceUnits.length, 73);
    strict_1.default.equal(summary.quantityPath, undefined);
    strict_1.default.equal(summary.numericValuePath, 'http://qudt.org/schema/qudt/numericValue');
    strict_1.default.equal(summary.unitPath, 'http://qudt.org/schema/qudt/unit');
});
(0, node_test_1.default)('automatic input discovery converts standard nested QUDT quantities', async () => {
    const message = (0, src_1.loadRdfMessageLog)((0, node_path_1.join)(fixtures, 'logs', 'length.trig'))[2];
    const output = automaticEngine().infer((0, src_1.loadQuads)((0, node_path_1.join)(fixtures, 'shapes', 'length-out.ttl')), [message]);
    const first = await output.next();
    strict_1.default.equal(first.done, false);
    if (first.done)
        return;
    strict_1.default.deepEqual(first.value.diagnostics, []);
    strict_1.default.equal(first.value.conversions.length, 1);
    strict_1.default.equal(first.value.conversions[0].targetValue, 2.5);
});
(0, node_test_1.default)('automatic input discovery converts direct CDT literals', async () => {
    const message = (0, src_1.loadRdfMessageLog)((0, node_path_1.join)(fixtures, 'logs', 'cdt-speed.trig'))[0];
    const output = automaticEngine().infer((0, src_1.loadQuads)((0, node_path_1.join)(fixtures, 'shapes', 'speed-out.ttl')), [message]);
    const first = await output.next();
    strict_1.default.equal(first.done, false);
    if (first.done)
        return;
    strict_1.default.deepEqual(first.value.diagnostics, []);
    strict_1.default.equal(first.value.conversions.length, 1);
    strict_1.default.ok(Math.abs(first.value.conversions[0].targetValue - 43.2) < 1e-10);
});
(0, node_test_1.default)('SHACL IN prunes the QUDT index to reachable dimensions', () => {
    const summary = lengthEngine().getPlanSummary();
    strict_1.default.equal(summary.totalQudtUnits, 73);
    strict_1.default.equal(summary.retainedQudtUnits, 10);
    strict_1.default.equal(summary.retainedDimensions.length, 1);
    strict_1.default.equal(summary.sourceUnits.length, 10);
});
(0, node_test_1.default)('compiled Eyeling program contains only target-compatible source units', () => {
    const compiled = lengthEngine().compile((0, src_1.loadQuads)((0, node_path_1.join)(fixtures, 'shapes', 'length-out.ttl')));
    strict_1.default.equal(compiled.compatibleSourceUnits.length, 10);
    strict_1.default.match(compiled.program, /http:\/\/qudt\.org\/vocab\/unit\/CentiM/);
    strict_1.default.doesNotMatch(compiled.program, /http:\/\/qudt\.org\/vocab\/unit\/SEC>/);
});
(0, node_test_1.default)('a dimensionally incompatible SHACL OUT is rejected before streaming starts', () => {
    strict_1.default.throws(() => lengthEngine().compile((0, src_1.loadQuads)((0, node_path_1.join)(fixtures, 'shapes', 'time-out.ttl'))), src_1.IncompatibleDimensionError);
});
(0, node_test_1.default)('a source unit outside the SHACL IN contract is not converted', async () => {
    const engine = lengthEngine();
    const timeMessage = (0, src_1.loadRdfMessageLog)((0, node_path_1.join)(fixtures, 'logs', 'time.trig'))[0];
    const output = engine.infer((0, src_1.loadQuads)((0, node_path_1.join)(fixtures, 'shapes', 'length-out.ttl')), [timeMessage]);
    const first = await output.next();
    strict_1.default.equal(first.done, false);
    if (first.done)
        return;
    strict_1.default.equal(first.value.conversions.length, 0);
    strict_1.default.equal(first.value.diagnostics[0]?.code, 'SOURCE_UNIT_NOT_ALLOWED');
});
//# sourceMappingURL=planner.test.js.map