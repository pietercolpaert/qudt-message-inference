"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QudtMessageInferenceEngine = exports.IncompatibleDimensionError = void 0;
const eyeling_1 = require("eyeling");
const n3_compiler_1 = require("./n3-compiler");
const shacl_plan_1 = require("./shacl-plan");
const qudt_index_1 = require("./qudt-index");
const rdf_1 = require("./rdf");
const graph_1 = require("./graph");
const vocab_1 = require("./vocab");
class IncompatibleDimensionError extends Error {
    targetUnit;
    targetDimension;
    sourceDimensions;
    constructor(targetUnit, targetDimension, sourceDimensions) {
        super(`Target unit ${targetUnit} has dimension ${targetDimension}, which is incompatible with the available input dimensions ${sourceDimensions.join(', ')}.`);
        this.targetUnit = targetUnit;
        this.targetDimension = targetDimension;
        this.sourceDimensions = sourceDimensions;
        this.name = 'IncompatibleDimensionError';
    }
}
exports.IncompatibleDimensionError = IncompatibleDimensionError;
async function* asAsyncMessages(source) {
    if (Symbol.asyncIterator in Object(source)) {
        for await (const message of source)
            yield message;
    }
    else {
        for (const message of source)
            yield message;
    }
}
function createQuad(subject, predicate, object) {
    return rdf_1.DataFactory.quad(subject, predicate, object);
}
function numericValue(term) {
    if (term.termType !== 'Literal')
        return undefined;
    const value = Number(term.value);
    return Number.isFinite(value) ? value : undefined;
}
function findObjects(quads, subject, predicate) {
    return quads
        .filter((quad) => (0, graph_1.sameTerm)(quad.subject, subject) && quad.predicate.value === predicate)
        .map((quad) => quad.object);
}
function findSubjects(quads, predicate, object) {
    const result = new Map();
    for (const quad of quads) {
        if (quad.predicate.value === predicate && (0, graph_1.sameTerm)(quad.object, object)) {
            result.set((0, graph_1.termKey)(quad.subject), quad.subject);
        }
    }
    return [...result.values()];
}
function findReferencingSubjects(quads, object) {
    const result = new Map();
    for (const quad of quads) {
        if ((0, graph_1.sameTerm)(quad.object, object))
            result.set((0, graph_1.termKey)(quad.subject), quad.subject);
    }
    return [...result.values()];
}
class QudtMessageInferenceEngine {
    inputPlan;
    index;
    sourceUnits;
    sourceDimensions;
    backwardRule;
    includeInputByDefault;
    summary;
    constructor(options) {
        this.index = new qudt_index_1.QudtUnitIndex(options.backgroundKnowledge);
        this.inputPlan = options.shaclIn
            ? (0, shacl_plan_1.compileInputShape)(options.shaclIn)
            : {
                representation: 'auto',
                targetClasses: [],
                numericValuePath: vocab_1.QUDT.numericValue,
                unitPath: vocab_1.QUDT.unit,
                allowedUnits: new Set(this.index.all().map((unit) => unit.iri)),
                literalDatatypes: new Set(vocab_1.CDT.supported),
            };
        const planned = this.index.plan(this.inputPlan);
        this.sourceUnits = planned.sourceUnits;
        this.sourceDimensions = planned.sourceDimensions;
        this.summary = planned.summary;
        this.backwardRule = options.backwardRule ?? (0, n3_compiler_1.loadDefaultBackwardRule)();
        this.includeInputByDefault = options.includeInputByDefault ?? true;
    }
    getPlanSummary() {
        return this.summary;
    }
    compile(shaclOut) {
        const outputPlan = (0, shacl_plan_1.compileOutputShape)(shaclOut);
        const target = this.index.require(outputPlan.targetUnit);
        if (!this.sourceDimensions.has(target.dimensionVector)) {
            throw new IncompatibleDimensionError(target.iri, target.dimensionVector, [...this.sourceDimensions]);
        }
        const compatibleSourceUnits = this.sourceUnits.filter((unit) => unit.dimensionVector === target.dimensionVector);
        const units = new Map();
        for (const unit of compatibleSourceUnits)
            units.set(unit.iri, unit);
        units.set(target.iri, target);
        return {
            outputPlan,
            compatibleSourceUnits,
            program: (0, n3_compiler_1.compileEyelingProgram)({
                backwardRule: this.backwardRule,
                index: this.index,
                units: [...units.values()],
                input: this.inputPlan,
                output: outputPlan,
            }),
        };
    }
    async *infer(shaclOut, messages, options = {}) {
        const compiled = this.compile(shaclOut);
        const includeInput = options.includeInput ?? this.includeInputByDefault;
        const emitProvenance = options.emitProvenance ?? true;
        const compatible = new Set(compiled.compatibleSourceUnits.map((unit) => unit.iri));
        let messageIndex = 0;
        for await (const message of asAsyncMessages(messages)) {
            const derived = [];
            const retainedPredicates = new Set([
                vocab_1.QCR.convertedNumericValue,
                vocab_1.QCR.parsedSourceLiteral,
                vocab_1.QCR.parsedSourceValue,
                vocab_1.QCR.parsedSourceUnit,
            ]);
            for await (const quad of (0, eyeling_1.reasonRdfJs)({ quads: [...message], n3: compiled.program })) {
                if (retainedPredicates.has(quad.predicate.value))
                    derived.push(quad);
            }
            const outputQuads = includeInput ? [...message] : [];
            const conversions = [];
            const diagnostics = [];
            let outputCounter = 0;
            const appendConversion = (root, sourceQuantity, sourceUnitTerm, sourceNumber, targetNumber) => {
                const outputQuantity = rdf_1.DataFactory.blankNode(`converted-${messageIndex}-${outputCounter++}`);
                const targetLiteral = rdf_1.DataFactory.literal(Number(targetNumber.toPrecision(15)).toString(), rdf_1.DataFactory.namedNode(vocab_1.XSD.decimal));
                outputQuads.push(createQuad(root, rdf_1.DataFactory.namedNode(compiled.outputPlan.quantityPath), outputQuantity), createQuad(outputQuantity, rdf_1.DataFactory.namedNode(vocab_1.RDF.type), rdf_1.DataFactory.namedNode(vocab_1.QUDT.QuantityValue)), createQuad(outputQuantity, rdf_1.DataFactory.namedNode(compiled.outputPlan.numericValuePath), targetLiteral), createQuad(outputQuantity, rdf_1.DataFactory.namedNode(compiled.outputPlan.unitPath), rdf_1.DataFactory.namedNode(compiled.outputPlan.targetUnit)));
                if (emitProvenance) {
                    outputQuads.push(createQuad(outputQuantity, rdf_1.DataFactory.namedNode(vocab_1.PROV.wasDerivedFrom), sourceQuantity), createQuad(outputQuantity, rdf_1.DataFactory.namedNode(vocab_1.QCR.convertedFromUnit), sourceUnitTerm), createQuad(outputQuantity, rdf_1.DataFactory.namedNode(vocab_1.QCR.convertedToUnit), rdf_1.DataFactory.namedNode(compiled.outputPlan.targetUnit)), createQuad(outputQuantity, rdf_1.DataFactory.namedNode(vocab_1.QCR.conversionProfile), rdf_1.DataFactory.namedNode(vocab_1.QCR.affineQudtProfile)));
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
            };
            if (this.inputPlan.representation === 'cdt-literal' ||
                this.inputPlan.representation === 'auto') {
                for (const sourceQuad of message) {
                    if (this.inputPlan.representation === 'cdt-literal' &&
                        sourceQuad.predicate.value !== this.inputPlan.quantityPath)
                        continue;
                    const root = sourceQuad.subject;
                    const sourceLiteral = sourceQuad.object;
                    if (this.inputPlan.representation === 'auto' &&
                        (sourceLiteral.termType !== 'Literal' ||
                            !this.inputPlan.literalDatatypes.has(sourceLiteral.datatype.value)))
                        continue;
                    if (sourceLiteral.termType !== 'Literal' ||
                        !this.inputPlan.literalDatatypes.has(sourceLiteral.datatype.value)) {
                        diagnostics.push({
                            code: 'INVALID_CDT_LITERAL',
                            message: 'The source value is not a supported CDT typed literal.',
                            sourceNode: root,
                            targetUnit: compiled.outputPlan.targetUnit,
                        });
                        continue;
                    }
                    const parsedLiteral = derived.some((quad) => (0, graph_1.sameTerm)(quad.subject, root) &&
                        quad.predicate.value === vocab_1.QCR.parsedSourceLiteral &&
                        (0, graph_1.sameTerm)(quad.object, sourceLiteral));
                    const sourceValueTerm = findObjects(derived, root, vocab_1.QCR.parsedSourceValue)[0];
                    const sourceUnitTerm = findObjects(derived, root, vocab_1.QCR.parsedSourceUnit)[0];
                    const resultTerm = findObjects(derived, root, vocab_1.QCR.convertedNumericValue)[0];
                    if (!parsedLiteral || !sourceValueTerm || !sourceUnitTerm || !resultTerm) {
                        diagnostics.push({
                            code: 'INVALID_CDT_LITERAL',
                            message: 'Eyeling could not parse the CDT lexical form or map its UCUM code to an allowed QUDT unit.',
                            sourceNode: root,
                            targetUnit: compiled.outputPlan.targetUnit,
                        });
                        continue;
                    }
                    if (sourceUnitTerm.termType !== 'NamedNode') {
                        diagnostics.push({
                            code: 'UNKNOWN_SOURCE_UNIT',
                            message: 'The UCUM code did not resolve to a QUDT unit IRI.',
                            sourceNode: root,
                            targetUnit: compiled.outputPlan.targetUnit,
                        });
                        continue;
                    }
                    if (!this.inputPlan.allowedUnits.has(sourceUnitTerm.value)) {
                        diagnostics.push({
                            code: 'SOURCE_UNIT_NOT_ALLOWED',
                            message: `Source unit ${sourceUnitTerm.value} is outside the trusted SHACL input contract.`,
                            sourceNode: root,
                            sourceUnit: sourceUnitTerm.value,
                            targetUnit: compiled.outputPlan.targetUnit,
                        });
                        continue;
                    }
                    if (!compatible.has(sourceUnitTerm.value)) {
                        diagnostics.push({
                            code: 'INCOMPATIBLE_DIMENSION',
                            message: `Source unit ${sourceUnitTerm.value} is not dimensionally compatible with ${compiled.outputPlan.targetUnit}.`,
                            sourceNode: root,
                            sourceUnit: sourceUnitTerm.value,
                            targetUnit: compiled.outputPlan.targetUnit,
                        });
                        continue;
                    }
                    const sourceNumber = numericValue(sourceValueTerm);
                    const targetNumber = numericValue(resultTerm);
                    if (sourceNumber === undefined || targetNumber === undefined) {
                        diagnostics.push({
                            code: 'NO_CONVERSION_RESULT',
                            message: 'Eyeling returned a non-numeric CDT parse or conversion result.',
                            sourceNode: root,
                            sourceUnit: sourceUnitTerm.value,
                            targetUnit: compiled.outputPlan.targetUnit,
                        });
                        continue;
                    }
                    appendConversion(root, root, sourceUnitTerm, sourceNumber, targetNumber);
                }
                if (this.inputPlan.representation === 'cdt-literal') {
                    yield { messageIndex, quads: outputQuads, conversions, diagnostics };
                    messageIndex += 1;
                    continue;
                }
            }
            const numericValuePath = this.inputPlan.numericValuePath;
            const unitPath = this.inputPlan.unitPath;
            if (!numericValuePath || !unitPath) {
                throw new Error('A QUDT quantity input plan requires numeric-value and unit paths.');
            }
            const sourceQuantities = new Map();
            if (this.inputPlan.representation === 'auto') {
                for (const quad of message) {
                    if (quad.predicate.value === numericValuePath) {
                        sourceQuantities.set((0, graph_1.termKey)(quad.subject), quad.subject);
                    }
                }
            }
            else {
                for (const quad of message) {
                    if (quad.predicate.value === this.inputPlan.quantityPath) {
                        sourceQuantities.set((0, graph_1.termKey)(quad.object), quad.object);
                    }
                }
            }
            for (const sourceQuantity of sourceQuantities.values()) {
                const sourceUnitTerm = findObjects(message, sourceQuantity, unitPath)[0];
                const sourceValueTerm = findObjects(message, sourceQuantity, numericValuePath)[0];
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
                        code: this.inputPlan.representation === 'auto'
                            ? 'UNKNOWN_SOURCE_UNIT'
                            : 'SOURCE_UNIT_NOT_ALLOWED',
                        message: this.inputPlan.representation === 'auto'
                            ? `Source unit ${sourceUnitTerm.value} is absent from the loaded QUDT background.`
                            : `Source unit ${sourceUnitTerm.value} is outside the trusted SHACL IN contract.`,
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
                const resultQuad = derived.find((quad) => (0, graph_1.sameTerm)(quad.subject, sourceQuantity));
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
                const roots = this.inputPlan.representation === 'auto'
                    ? findReferencingSubjects(message, sourceQuantity)
                    : findSubjects(message, this.inputPlan.quantityPath ?? '', sourceQuantity);
                for (const root of roots) {
                    appendConversion(root, sourceQuantity, sourceUnitTerm, sourceNumber, targetNumber);
                }
            }
            yield { messageIndex, quads: outputQuads, conversions, diagnostics };
            messageIndex += 1;
        }
    }
}
exports.QudtMessageInferenceEngine = QudtMessageInferenceEngine;
//# sourceMappingURL=engine.js.map