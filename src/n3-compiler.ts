import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { iri } from './rdf';
import type { InputShapePlan, OutputShapePlan, QudtUnitDefinition } from './types';
import { QCR, RDF } from './vocab';
import { QudtUnitIndex } from './qudt-index';

export function loadDefaultBackwardRule(): string {
  return readFileSync(resolve(__dirname, '../../rules/qudt-conversion.n3'), 'utf8');
}

function compileTriggerRule(input: InputShapePlan, output: OutputShapePlan): string {
  const classGuard = input.targetClasses.length
    ? input.targetClasses.map((classIri) => `?root ${iri(RDF.type)} ${iri(classIri)} .`).join('\n  ')
    : '';
  if (input.representation === 'cdt-literal') {
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
  const cdtFacts = options.input.representation === 'cdt-literal'
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
    '# Effective QUDT facts selected by the SHACL planner.',
    options.index.serializeEffectiveFacts(options.units).trim(),
    cdtFacts ? '\n# CDT datatypes and source units selected by SHACL.\n' + cdtFacts : '',
    '',
    '# Forward trigger compiled from SHACL IN and SHACL OUT.',
    compileTriggerRule(options.input, options.output).trim(),
    '',
  ].join('\n');
}
