"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_test_1 = __importDefault(require("node:test"));
function closeEnough(actual, expected) {
    const tolerance = Math.max(1e-10, Math.abs(expected) * 1e-10);
    return Math.abs(actual - expected) <= tolerance;
}
(0, node_test_1.default)('the generated browser playground contains and converts the full corpus', () => {
    const root = (0, node_path_1.resolve)(__dirname, '../..');
    const source = (0, node_fs_1.readFileSync)((0, node_path_1.join)(root, 'dist', 'playground', 'cases.js'), 'utf8');
    const match = /^window\.QUDT_PLAYGROUND_DATA = ([\s\S]+);\n$/.exec(source);
    strict_1.default.ok(match, 'cases.js should assign generated JSON to the browser data global');
    const data = JSON.parse(match[1]);
    strict_1.default.equal(data.totalCases, 78);
    strict_1.default.equal(data.totalUnits, 73);
    strict_1.default.equal(data.structuredCases, 73);
    strict_1.default.equal(data.literalCases, 5);
    strict_1.default.equal(data.dimensions, 13);
    strict_1.default.equal(data.cases.length, data.totalCases);
    strict_1.default.equal(new Set(data.cases.map((item) => item.id)).size, data.totalCases);
    strict_1.default.equal(new Set(data.cases.map((item) => item.dimension)).size, data.dimensions);
    strict_1.default.equal(data.cases.filter((item) => item.representation === 'cdt-literal').length, data.literalCases);
    strict_1.default.ok(data.cases.every((item) => item.inputRdf.includes(item.sourceValue)));
    strict_1.default.ok(data.cases.some((item) => item.representation === 'cdt-literal' &&
        item.inputRdf.includes('http://w3id.org/lindt/custom_datatypes#speed')));
    strict_1.default.ok(data.cases.some((item) => item.representation === 'cdt-literal' &&
        item.inputRdf.includes('https://w3id.org/cdt/ucum')));
    for (const item of data.cases) {
        const canonical = (Number(item.sourceValue) + item.source.offset) * item.source.multiplier;
        const actual = canonical / item.target.multiplier - item.target.offset;
        strict_1.default.ok(closeEnough(actual, Number(item.expectedValue)), `${item.id} did not match its fixture`);
    }
});
//# sourceMappingURL=playground.test.js.map