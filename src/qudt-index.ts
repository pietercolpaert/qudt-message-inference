import type { Quad, Term } from '@rdfjs/types';
import { firstObject, objects, subjects } from './graph';
import { escapeLiteral, iri } from './rdf';
import type { InputShapePlan, PlannerSummary, QudtUnitDefinition } from './types';
import { QCR, QUDT } from './vocab';

function numericObject(term: Term | undefined, context: string): number {
  if (!term || term.termType !== 'Literal') {
    throw new Error(`${context} must be an RDF numeric literal.`);
  }
  const value = Number(term.value);
  if (!Number.isFinite(value)) throw new Error(`${context} is not a finite number: ${term.value}`);
  return value;
}

export class QudtUnitIndex {
  private readonly unitsByIri: ReadonlyMap<string, QudtUnitDefinition>;

  public constructor(backgroundKnowledge: readonly Quad[]) {
    const map = new Map<string, QudtUnitDefinition>();
    const candidateSubjects = subjects(backgroundKnowledge, QUDT.conversionMultiplier);

    for (const subject of candidateSubjects) {
      if (subject.termType !== 'NamedNode') continue;
      const multiplier = numericObject(
        firstObject(backgroundKnowledge, subject, QUDT.conversionMultiplier),
        `${subject.value} qudt:conversionMultiplier`,
      );
      if (multiplier === 0) continue;
      const dimension = firstObject(backgroundKnowledge, subject, QUDT.hasDimensionVector);
      if (!dimension || dimension.termType !== 'NamedNode') continue;
      const offsetTerm = firstObject(backgroundKnowledge, subject, QUDT.conversionOffset);
      const offset = offsetTerm
        ? numericObject(offsetTerm, `${subject.value} qudt:conversionOffset`)
        : 0;
      const symbol = objects(backgroundKnowledge, subject, QUDT.symbol).find(
        (term) => term.termType === 'Literal',
      )?.value;
      const ucumCodes = objects(backgroundKnowledge, subject, QUDT.ucumCode)
        .filter((term) => term.termType === 'Literal')
        .map((term) => term.value);
      map.set(subject.value, {
        iri: subject.value,
        dimensionVector: dimension.value,
        multiplier,
        offset,
        symbol,
        ucumCodes,
      });
    }
    this.unitsByIri = map;
  }

  public get size(): number {
    return this.unitsByIri.size;
  }

  public get(unitIri: string): QudtUnitDefinition | undefined {
    return this.unitsByIri.get(unitIri);
  }

  public require(unitIri: string): QudtUnitDefinition {
    const unit = this.get(unitIri);
    if (!unit) {
      throw new Error(
        `QUDT background does not contain a usable affine conversion definition for ${unitIri}.`,
      );
    }
    return unit;
  }

  public all(): readonly QudtUnitDefinition[] {
    return [...this.unitsByIri.values()];
  }

  public unitsInDimensions(dimensions: ReadonlySet<string>): readonly QudtUnitDefinition[] {
    return this.all().filter((unit) => dimensions.has(unit.dimensionVector));
  }

  public plan(input: InputShapePlan): {
    readonly retainedUnits: readonly QudtUnitDefinition[];
    readonly sourceUnits: readonly QudtUnitDefinition[];
    readonly sourceDimensions: ReadonlySet<string>;
    readonly summary: PlannerSummary;
  } {
    const sourceUnits = [...input.allowedUnits].map((unitIri) => this.require(unitIri));
    const sourceDimensions = new Set(sourceUnits.map((unit) => unit.dimensionVector));
    const retainedUnits = this.unitsInDimensions(sourceDimensions);
    return {
      retainedUnits,
      sourceUnits,
      sourceDimensions,
      summary: {
        inputRepresentation: input.representation,
        totalQudtUnits: this.size,
        retainedQudtUnits: retainedUnits.length,
        sourceUnits: sourceUnits.map((unit) => unit.iri).sort(),
        retainedDimensions: [...sourceDimensions].sort(),
        quantityPath: input.quantityPath,
        numericValuePath: input.numericValuePath,
        unitPath: input.unitPath,
      },
    };
  }

  public serializeEffectiveFacts(units: readonly QudtUnitDefinition[]): string {
    const lines: string[] = [];
    for (const unit of [...units].sort((a, b) => a.iri.localeCompare(b.iri))) {
      lines.push(
        `${iri(unit.iri)} ${iri(QUDT.hasDimensionVector)} ${iri(unit.dimensionVector)} ;`,
        `  ${iri(QUDT.conversionMultiplier)} "${unit.multiplier}"^^<http://www.w3.org/2001/XMLSchema#decimal> ;`,
        `  ${iri(QCR.effectiveConversionMultiplier)} "${unit.multiplier}"^^<http://www.w3.org/2001/XMLSchema#decimal> ;`,
        `  ${iri(QCR.effectiveConversionOffset)} "${unit.offset}"^^<http://www.w3.org/2001/XMLSchema#decimal> .`,
        '',
      );
      for (const code of [...unit.ucumCodes].sort()) {
        lines.push(
          `${iri(unit.iri)} ${iri(QCR.recognizedUcumCode)} "${escapeLiteral(code)}" .`,
        );
      }
      if (unit.ucumCodes.length > 0) lines.push('');
    }
    return lines.join('\n');
  }
}
