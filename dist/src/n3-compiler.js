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
    if (input.representation === 'auto') {
        return `
{
  ?root ?sourcePath ?sourceQuantity .
  ?sourceQuantity ${(0, rdf_1.iri)(vocab_1.QUDT.numericValue)} ?sourceValue .
  ?sourceQuantity ${(0, rdf_1.iri)(vocab_1.QUDT.unit)} ?sourceUnit .
  (?sourceValue ?sourceUnit ${(0, rdf_1.iri)(output.targetUnit)}) ${(0, rdf_1.iri)(vocab_1.QCR.convertedValue)} ?targetValue .
}
=>
{
  ?sourceQuantity ${(0, rdf_1.iri)(vocab_1.QCR.convertedNumericValue)} ?targetValue .
} .

{
  ?root ?sourcePath ?sourceLiteral .
  (?sourceLiteral ?sourceDatatype) ${(0, rdf_1.iri)(vocab_1.QCR.parsedCdtValue)} (?sourceValue ?sourceUnit) .
  (?sourceValue ?sourceUnit ${(0, rdf_1.iri)(output.targetUnit)}) ${(0, rdf_1.iri)(vocab_1.QCR.convertedValue)} ?targetValue .
}
=>
{
  ?root ${(0, rdf_1.iri)(vocab_1.QCR.parsedSourceLiteral)} ?sourceLiteral ;
    ${(0, rdf_1.iri)(vocab_1.QCR.parsedSourceValue)} ?sourceValue ;
    ${(0, rdf_1.iri)(vocab_1.QCR.parsedSourceUnit)} ?sourceUnit ;
    ${(0, rdf_1.iri)(vocab_1.QCR.convertedNumericValue)} ?targetValue .
} .
`;
    }
    if (input.representation === 'cdt-literal') {
        if (!input.quantityPath)
            throw new Error('A CDT literal input plan requires a property path.');
        return `
{
  ${classGuard}
  ?root ${(0, rdf_1.iri)(input.quantityPath)} ?sourceLiteral .
  (?sourceLiteral ?sourceDatatype) ${(0, rdf_1.iri)(vocab_1.QCR.parsedCdtValue)} (?sourceValue ?sourceUnit) .
  (?sourceValue ?sourceUnit ${(0, rdf_1.iri)(output.targetUnit)}) ${(0, rdf_1.iri)(vocab_1.QCR.convertedValue)} ?targetValue .
}
=>
{
  ?root ${(0, rdf_1.iri)(vocab_1.QCR.parsedSourceLiteral)} ?sourceLiteral ;
    ${(0, rdf_1.iri)(vocab_1.QCR.parsedSourceValue)} ?sourceValue ;
    ${(0, rdf_1.iri)(vocab_1.QCR.parsedSourceUnit)} ?sourceUnit ;
    ${(0, rdf_1.iri)(vocab_1.QCR.convertedNumericValue)} ?targetValue .
} .
`;
    }
    if (!input.numericValuePath || !input.unitPath) {
        throw new Error('A QUDT quantity input plan requires numeric-value and unit paths.');
    }
    if (!input.quantityPath)
        throw new Error('A QUDT quantity input plan requires a root path.');
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
    const cdtFacts = options.input.representation !== 'qudt-quantity'
        ? [
            ...[...options.input.literalDatatypes].sort().map((datatype) => `${(0, rdf_1.iri)(datatype)} ${(0, rdf_1.iri)(vocab_1.QCR.supportedCdtDatatype)} true .`),
            ...options.units
                .filter((unit) => options.input.allowedUnits.has(unit.iri))
                .sort((a, b) => a.iri.localeCompare(b.iri))
                .map((unit) => `${(0, rdf_1.iri)(unit.iri)} ${(0, rdf_1.iri)(vocab_1.QCR.allowedCdtSourceUnit)} true .`),
        ].join('\n')
        : '';
    return [
        options.backwardRule.trim(),
        '',
        '# Effective QUDT facts selected for this conversion.',
        options.index.serializeEffectiveFacts(options.units).trim(),
        cdtFacts ? '\n# Accepted CDT datatypes and source units.\n' + cdtFacts : '',
        '',
        '# Forward trigger compiled from the input profile and SHACL OUT.',
        compileTriggerRule(options.input, options.output).trim(),
        '',
    ].join('\n');
}
//# sourceMappingURL=n3-compiler.js.map