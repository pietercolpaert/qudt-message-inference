import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { iri } from './rdf';
import type { InputShapePlan, OutputShapePlan, QudtUnitDefinition } from './types';
import { QCR, QUDT, RDF } from './vocab';
import { QudtUnitIndex } from './qudt-index';

export function loadDefaultBackwardRule(): string {
  return readFileSync(resolve(__dirname, '../../rules/qudt-conversion.n3'), 'utf8');
}

function compileTriggerRule(input: InputShapePlan, output: OutputShapePlan): string {
  const classGuard = input.targetClasses.length
    ? input.targetClasses.map((classIri) => `?root ${iri(RDF.type)} ${iri(classIri)} .`).join('\n  ')
    : '';
  if (input.representation === 'auto') {
    return `
{
  ?root ?sourcePath ?sourceQuantity .
  ?sourceQuantity ${iri(QUDT.numericValue)} ?sourceValue .
  ?sourceQuantity ${iri(QUDT.unit)} ?sourceUnit .
  (?sourceValue ?sourceUnit ${iri(output.targetUnit)}) ${iri(QCR.convertedValue)} ?targetValue .
}
=>
{
  ?sourceQuantity ${iri(QCR.convertedNumericValue)} ?targetValue .
} .

{
  ?root ?sourcePath ?sourceLiteral .
  (?sourceLiteral ?sourceDatatype) ${iri(QCR.parsedCdtValue)} (?sourceValue ?sourceUnit) .
  (?sourceValue ?sourceUnit ${iri(output.targetUnit)}) ${iri(QCR.convertedValue)} ?targetValue .
}
=>
{
  ?root ${iri(QCR.parsedSourceLiteral)} ?sourceLiteral ;
    ${iri(QCR.parsedSourceValue)} ?sourceValue ;
    ${iri(QCR.parsedSourceUnit)} ?sourceUnit ;
    ${iri(QCR.convertedNumericValue)} ?targetValue .
} .
`;
  }
  if (input.representation === 'cdt-literal') {
    if (!input.quantityPath) throw new Error('A CDT literal input plan requires a property path.');
    return `
{
  ${classGuard}
  ?root ${iri(input.quantityPath)} ?sourceLiteral .
  (?sourceLiteral ?sourceDatatype) ${iri(QCR.parsedCdtValue)} (?sourceValue ?sourceUnit) .
  (?sourceValue ?sourceUnit ${iri(output.targetUnit)}) ${iri(QCR.convertedValue)} ?targetValue .
}
=>
{
  ?root ${iri(QCR.parsedSourceLiteral)} ?sourceLiteral ;
    ${iri(QCR.parsedSourceValue)} ?sourceValue ;
    ${iri(QCR.parsedSourceUnit)} ?sourceUnit ;
    ${iri(QCR.convertedNumericValue)} ?targetValue .
} .
`;
  }
  if (!input.numericValuePath || !input.unitPath) {
    throw new Error('A QUDT quantity input plan requires numeric-value and unit paths.');
  }
  if (!input.quantityPath) throw new Error('A QUDT quantity input plan requires a root path.');
  return `
{
  ${classGuard}
  ?root ${iri(input.quantityPath)} ?sourceQuantity .
  ?sourceQuantity ${iri(input.numericValuePath)} ?sourceValue .
  ?sourceQuantity ${iri(input.unitPath)} ?sourceUnit .
  (?sourceValue ?sourceUnit ${iri(output.targetUnit)}) ${iri(QCR.convertedValue)} ?targetValue .
}
=>
{
  ?sourceQuantity ${iri(QCR.convertedNumericValue)} ?targetValue .
} .
`;
}

export function compileEyelingProgram(options: {
  readonly backwardRule: string;
  readonly index: QudtUnitIndex;
  readonly units: readonly QudtUnitDefinition[];
  readonly input: InputShapePlan;
  readonly output: OutputShapePlan;
}): string {
  const cdtFacts = options.input.representation !== 'qudt-quantity'
    ? [
        ...[...options.input.literalDatatypes].sort().map(
          (datatype) => `${iri(datatype)} ${iri(QCR.supportedCdtDatatype)} true .`,
        ),
        ...options.units
          .filter((unit) => options.input.allowedUnits.has(unit.iri))
          .sort((a, b) => a.iri.localeCompare(b.iri))
          .map((unit) => `${iri(unit.iri)} ${iri(QCR.allowedCdtSourceUnit)} true .`),
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
