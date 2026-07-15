"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadDefaultBackwardRule = loadDefaultBackwardRule;
exports.compileEyelingProgram = compileEyelingProgram;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const rdf_1 = require("./rdf");
const vocab_1 = require("./vocab");
function loadDefaultBackwardRule() {
    return (0, node_fs_1.readFileSync)((0, node_path_1.resolve)(__dirname, '../../rules/qudt-conversion.n3'), 'utf8');
}
function compileTriggerRule(input, output) {
    const classGuard = input.targetClasses.length
        ? input.targetClasses.map((classIri) => `?root ${(0, rdf_1.iri)(vocab_1.RDF.type)} ${(0, rdf_1.iri)(classIri)} .`).join('\n  ')
        : '';
    return `
{
  ${classGuard}
  ?root ${(0, rdf_1.iri)(input.quantityPath)} ?sourceQuantity .
  ?sourceQuantity ${(0, rdf_1.iri)(input.numericValuePath)} ?sourceValue .
  ?sourceQuantity ${(0, rdf_1.iri)(input.unitPath)} ?sourceUnit .
  (?sourceValue ?sourceUnit ${(0, rdf_1.iri)(output.targetUnit)}) ${(0, rdf_1.iri)(vocab_1.QCR.convertedValue)} ?targetValue .
}
=>
{
  ?sourceQuantity ${(0, rdf_1.iri)(vocab_1.QCR.convertedNumericValue)} ?targetValue .
} .
`;
}
function compileEyelingProgram(options) {
    return [
        options.backwardRule.trim(),
        '',
        '# Effective QUDT facts selected by the SHACL planner.',
        options.index.serializeEffectiveFacts(options.units).trim(),
        '',
        '# Forward trigger compiled from SHACL IN and SHACL OUT.',
        compileTriggerRule(options.input, options.output).trim(),
        '',
    ].join('\n');
}
//# sourceMappingURL=n3-compiler.js.map