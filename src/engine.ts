import type { Quad, Quad_Object, Quad_Predicate, Quad_Subject, Term } from '@rdfjs/types';
import { reasonRdfJs } from 'eyeling';
import { compileEyelingProgram, loadDefaultBackwardRule } from './n3-compiler';
import { compileInputShape, compileOutputShape } from './shacl-plan';
import { QudtUnitIndex } from './qudt-index';
import { DataFactory } from './rdf';
import { sameTerm, termKey } from './graph';
import type {
  ConversionDiagnostic,
  ConversionRecord,
  EngineOptions,
  InferOptions,
  InferredRdfMessage,
  InputShapePlan,
  OutputShapePlan,
  PlannerSummary,
  QudtUnitDefinition,
  RdfMessage,
} from './types';
import { PROV, QCR, QUDT, RDF, XSD } from './vocab';

export class IncompatibleDimensionError extends Error {
  public constructor(
    public readonly targetUnit: string,
    public readonly targetDimension: string,
    public readonly sourceDimensions: readonly string[],
  ) {
    super(
      `Target unit ${targetUnit} has dimension ${targetDimension}, which is incompatible with SHACL IN dimensions ${sourceDimensions.join(', ')}.`,
    );
    this.name = 'IncompatibleDimensionError';
  }
}

async function* asAsyncMessages(
  source: AsyncIterable<RdfMessage> | Iterable<RdfMessage>,
): AsyncGenerator<RdfMessage> {
  if (Symbol.asyncIterator in Object(source)) {
    for await (const message of source as AsyncIterable<RdfMessage>) yield message;
  } else {
    for (const message of source as Iterable<RdfMessage>) yield message;
  }
}


function createQuad(subject: Term, predicate: Term, object: Term): Quad {
  return DataFactory.quad(
    subject as Quad_Subject,
    predicate as Quad_Predicate,
    object as Quad_Object,
  ) as Quad;
}

function numericValue(term: Term): number | undefined {
  if (term.termType !== 'Literal') return undefined;
  const value = Number(term.value);
  return Number.isFinite(value) ? value : undefined;
}

function findObjects(quads: readonly Quad[], subject: Term, predicate: string): Term[] {
  return quads
    .filter((quad) => sameTerm(quad.subject, subject) && quad.predicate.value === predicate)
    .map((quad) => quad.object);
}

function findSubjects(quads: readonly Quad[], predicate: string, object: Term): Term[] {
  const result = new Map<string, Term>();
  for (const quad of quads) {
    if (quad.predicate.value === predicate && sameTerm(quad.object, object)) {
      result.set(termKey(quad.subject), quad.subject);
    }
  }
  return [...result.values()];
}

export class QudtMessageInferenceEngine {
  private readonly inputPlan: InputShapePlan;
  private readonly index: QudtUnitIndex;
  private readonly sourceUnits: readonly QudtUnitDefinition[];
  private readonly sourceDimensions: ReadonlySet<string>;
  private readonly backwardRule: string;
  private readonly includeInputByDefault: boolean;
  private readonly summary: PlannerSummary;

  public constructor(options: EngineOptions) {
    this.inputPlan = compileInputShape(options.shaclIn);
    this.index = new QudtUnitIndex(options.backgroundKnowledge);
    const planned = this.index.plan(this.inputPlan);
    this.sourceUnits = planned.sourceUnits;
    this.sourceDimensions = planned.sourceDimensions;
    this.summary = planned.summary;
    this.backwardRule = options.backwardRule ?? loadDefaultBackwardRule();
    this.includeInputByDefault = options.includeInputByDefault ?? true;
  }

  public getPlanSummary(): PlannerSummary {
    return this.summary;
  }

  public compile(shaclOut: readonly Quad[]): {
    readonly outputPlan: OutputShapePlan;
    readonly program: string;
    readonly compatibleSourceUnits: readonly QudtUnitDefinition[];
  } {
    const outputPlan = compileOutputShape(shaclOut);
    const target = this.index.require(outputPlan.targetUnit);
    if (!this.sourceDimensions.has(target.dimensionVector)) {
      throw new IncompatibleDimensionError(
        target.iri,
        target.dimensionVector,
        [...this.sourceDimensions],
      );
    }
    const compatibleSourceUnits = this.sourceUnits.filter(
      (unit) => unit.dimensionVector === target.dimensionVector,
    );
    const units = new Map<string, QudtUnitDefinition>();
    for (const unit of compatibleSourceUnits) units.set(unit.iri, unit);
    units.set(target.iri, target);
    return {
      outputPlan,
      compatibleSourceUnits,
      program: compileEyelingProgram({
        backwardRule: this.backwardRule,
        index: this.index,
        units: [...units.values()],
        input: this.inputPlan,
        output: outputPlan,
      }),
    };
  }

  public async *infer(
    shaclOut: readonly Quad[],
    messages: AsyncIterable<RdfMessage> | Iterable<RdfMessage>,
    options: InferOptions = {},
  ): AsyncGenerator<InferredRdfMessage> {
    const compiled = this.compile(shaclOut);
    const includeInput = options.includeInput ?? this.includeInputByDefault;
    const emitProvenance = options.emitProvenance ?? true;
    const compatible = new Set(compiled.compatibleSourceUnits.map((unit) => unit.iri));
    let messageIndex = 0;

    for await (const message of asAsyncMessages(messages)) {
      const derived: Quad[] = [];
      for await (const quad of reasonRdfJs({ quads: [...message], n3: compiled.program })) {
        if (quad.predicate.value === QCR.convertedNumericValue) derived.push(quad);
      }

      const outputQuads: Quad[] = includeInput ? [...message] : [];
      const conversions: ConversionRecord[] = [];
      const diagnostics: ConversionDiagnostic[] = [];
      let outputCounter = 0;

      const sourceQuantities = new Map<string, Term>();
      for (const quad of message) {
        if (quad.predicate.value === this.inputPlan.quantityPath) {
          sourceQuantities.set(termKey(quad.object), quad.object);
        }
      }

      for (const sourceQuantity of sourceQuantities.values()) {
        const sourceUnitTerm = findObjects(message, sourceQuantity, this.inputPlan.unitPath)[0];
        const sourceValueTerm = findObjects(message, sourceQuantity, this.inputPlan.numericValuePath)[0];
        if (!sourceUnitTerm) {
          diagnostics.push({
            code: 'MISSING_UNIT',
            message: 'The source quantity has no unit value.',
            sourceNode: sourceQuantity,
            targetUnit: compiled.outputPlan.targetUnit,
          });
          continue;
        }
        if (sourceUnitTerm.termType !== 'NamedNode') {
          diagnostics.push({
            code: 'UNKNOWN_SOURCE_UNIT',
            message: 'The source unit is not a QUDT unit IRI.',
            sourceNode: sourceQuantity,
            targetUnit: compiled.outputPlan.targetUnit,
          });
          continue;
        }
        if (!this.inputPlan.allowedUnits.has(sourceUnitTerm.value)) {
          diagnostics.push({
            code: 'SOURCE_UNIT_NOT_ALLOWED',
            message: `Source unit ${sourceUnitTerm.value} is outside the trusted SHACL IN contract.`,
            sourceNode: sourceQuantity,
            sourceUnit: sourceUnitTerm.value,
            targetUnit: compiled.outputPlan.targetUnit,
          });
          continue;
        }
        if (!compatible.has(sourceUnitTerm.value)) {
          diagnostics.push({
            code: 'INCOMPATIBLE_DIMENSION',
            message: `Source unit ${sourceUnitTerm.value} is not dimensionally compatible with ${compiled.outputPlan.targetUnit}.`,
            sourceNode: sourceQuantity,
            sourceUnit: sourceUnitTerm.value,
            targetUnit: compiled.outputPlan.targetUnit,
          });
          continue;
        }
        if (!sourceValueTerm) {
          diagnostics.push({
            code: 'MISSING_NUMERIC_VALUE',
            message: 'The source quantity has no numeric value.',
            sourceNode: sourceQuantity,
            sourceUnit: sourceUnitTerm.value,
            targetUnit: compiled.outputPlan.targetUnit,
          });
          continue;
        }
        const sourceNumber = numericValue(sourceValueTerm);
        if (sourceNumber === undefined) {
          diagnostics.push({
            code: 'MISSING_NUMERIC_VALUE',
            message: `The source value ${sourceValueTerm.value} is not numeric.`,
            sourceNode: sourceQuantity,
            sourceUnit: sourceUnitTerm.value,
            targetUnit: compiled.outputPlan.targetUnit,
          });
          continue;
        }

        const resultQuad = derived.find(
          (quad) => sameTerm(quad.subject, sourceQuantity),
        );
        if (!resultQuad) {
          diagnostics.push({
            code: 'NO_CONVERSION_RESULT',
            message: 'Eyeling did not derive a converted value for the source quantity.',
            sourceNode: sourceQuantity,
            sourceUnit: sourceUnitTerm.value,
            targetUnit: compiled.outputPlan.targetUnit,
          });
          continue;
        }
        const targetNumber = numericValue(resultQuad.object);
        if (targetNumber === undefined) {
          diagnostics.push({
            code: 'NO_CONVERSION_RESULT',
            message: 'Eyeling returned a non-numeric conversion result.',
            sourceNode: sourceQuantity,
            sourceUnit: sourceUnitTerm.value,
            targetUnit: compiled.outputPlan.targetUnit,
          });
          continue;
        }

        const roots = findSubjects(message, this.inputPlan.quantityPath, sourceQuantity);
        for (const root of roots) {
          const outputQuantity = DataFactory.blankNode(
            `converted-${messageIndex}-${outputCounter++}`,
          );
          const targetLiteral = DataFactory.literal(
            Number(targetNumber.toPrecision(15)).toString(),
            DataFactory.namedNode(XSD.decimal),
          );
          outputQuads.push(
            createQuad(
              root,
              DataFactory.namedNode(compiled.outputPlan.quantityPath),
              outputQuantity,
            ),
            createQuad(
              outputQuantity,
              DataFactory.namedNode(RDF.type),
              DataFactory.namedNode(QUDT.QuantityValue),
            ),
            createQuad(
              outputQuantity,
              DataFactory.namedNode(compiled.outputPlan.numericValuePath),
              targetLiteral,
            ),
            createQuad(
              outputQuantity,
              DataFactory.namedNode(compiled.outputPlan.unitPath),
              DataFactory.namedNode(compiled.outputPlan.targetUnit),
            ),
          );
          if (emitProvenance) {
            outputQuads.push(
              createQuad(
                outputQuantity,
                DataFactory.namedNode(PROV.wasDerivedFrom),
                sourceQuantity,
              ),
              createQuad(
                outputQuantity,
                DataFactory.namedNode(QCR.convertedFromUnit),
                sourceUnitTerm,
              ),
              createQuad(
                outputQuantity,
                DataFactory.namedNode(QCR.convertedToUnit),
                DataFactory.namedNode(compiled.outputPlan.targetUnit),
              ),
              createQuad(
                outputQuantity,
                DataFactory.namedNode(QCR.conversionProfile),
                DataFactory.namedNode(QCR.affineQudtProfile),
              ),
            );
          }
          conversions.push({
            root,
            sourceQuantity,
            outputQuantity,
            sourceUnit: sourceUnitTerm.value,
            targetUnit: compiled.outputPlan.targetUnit,
            sourceValue: sourceNumber,
            targetValue: targetNumber,
          });
        }
      }

      yield { messageIndex, quads: outputQuads, conversions, diagnostics };
      messageIndex += 1;
    }
  }
}
