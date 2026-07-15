"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const node_test_1 = __importDefault(require("node:test"));
const eyeling_1 = require("eyeling");
const src_1 = require("../src");
const root = (0, node_path_1.resolve)(__dirname, '../..');
(0, node_test_1.default)('the generated combined N3 background can be imported directly by Eyeling', async () => {
    const background = (0, node_fs_1.readFileSync)((0, node_path_1.join)(root, 'dist', 'background', 'qudt-conversion-background.n3'), 'utf8');
    const trigger = `
@prefix ex:   <https://example.org/> .
@prefix qudt: <http://qudt.org/schema/qudt/> .
@prefix unit: <http://qudt.org/vocab/unit/> .
@prefix qcr:  <https://w3id.org/qudt-inference#> .

{
  ?root ex:quantity ?quantity .
  ?quantity qudt:numericValue ?value ; qudt:unit ?unit .
  (?value ?unit unit:M) qcr:convertedValue ?converted .
}
=>
{
  ?quantity qcr:convertedNumericValue ?converted .
} .
`;
    const message = (0, src_1.loadRdfMessageLog)((0, node_path_1.join)(root, 'tests', 'fixtures', 'logs', 'length.trig'))[2];
    const inferred = [];
    for await (const quad of (0, eyeling_1.reasonRdfJs)({ quads: message, n3: `${background}\n${trigger}` })) {
        if (quad.predicate.value === src_1.QCR.convertedNumericValue)
            inferred.push(quad);
    }
    strict_1.default.equal(inferred.length, 1);
    strict_1.default.equal(Number(inferred[0].object.value), 2.5);
});
//# sourceMappingURL=background-import.test.js.map