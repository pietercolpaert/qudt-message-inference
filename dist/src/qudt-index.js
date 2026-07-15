"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QudtUnitIndex = void 0;
const graph_1 = require("./graph");
const rdf_1 = require("./rdf");
const vocab_1 = require("./vocab");
function numericObject(term, context) {
    if (!term || term.termType !== 'Literal') {
        throw new Error(`${context} must be an RDF numeric literal.`);
    }
    const value = Number(term.value);
    if (!Number.isFinite(value))
        throw new Error(`${context} is not a finite number: ${term.value}`);
    return value;
}
class QudtUnitIndex {
    unitsByIri;
    constructor(backgroundKnowledge) {
        const map = new Map();
        const candidateSubjects = (0, graph_1.subjects)(backgroundKnowledge, vocab_1.QUDT.conversionMultiplier);
        for (const subject of candidateSubjects) {
            if (subject.termType !== 'NamedNode')
                continue;
            const multiplier = numericObject((0, graph_1.firstObject)(backgroundKnowledge, subject, vocab_1.QUDT.conversionMultiplier), `${subject.value} qudt:conversionMultiplier`);
            if (multiplier === 0)
                continue;
            const dimension = (0, graph_1.firstObject)(backgroundKnowledge, subject, vocab_1.QUDT.hasDimensionVector);
            if (!dimension || dimension.termType !== 'NamedNode')
                continue;
            const offsetTerm = (0, graph_1.firstObject)(backgroundKnowledge, subject, vocab_1.QUDT.conversionOffset);
            const offset = offsetTerm
                ? numericObject(offsetTerm, `${subject.value} qudt:conversionOffset`)
                : 0;
            const symbol = (0, graph_1.objects)(backgroundKnowledge, subject, vocab_1.QUDT.symbol).find((term) => term.termType === 'Literal')?.value;
            const ucumCodes = (0, graph_1.objects)(backgroundKnowledge, subject, vocab_1.QUDT.ucumCode)
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
    get size() {
        return this.unitsByIri.size;
    }
    get(unitIri) {
        return this.unitsByIri.get(unitIri);
    }
    require(unitIri) {
        const unit = this.get(unitIri);
        if (!unit) {
            throw new Error(`QUDT background does not contain a usable affine conversion definition for ${unitIri}.`);
        }
        return unit;
    }
    all() {
        return [...this.unitsByIri.values()];
    }
    unitsInDimensions(dimensions) {
        return this.all().filter((unit) => dimensions.has(unit.dimensionVector));
    }
    plan(input) {
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
    serializeEffectiveFacts(units) {
        const lines = [];
        for (const unit of [...units].sort((a, b) => a.iri.localeCompare(b.iri))) {
            lines.push(`${(0, rdf_1.iri)(unit.iri)} ${(0, rdf_1.iri)(vocab_1.QUDT.hasDimensionVector)} ${(0, rdf_1.iri)(unit.dimensionVector)} ;`, `  ${(0, rdf_1.iri)(vocab_1.QUDT.conversionMultiplier)} "${unit.multiplier}"^^<http://www.w3.org/2001/XMLSchema#decimal> ;`, `  ${(0, rdf_1.iri)(vocab_1.QCR.effectiveConversionMultiplier)} "${unit.multiplier}"^^<http://www.w3.org/2001/XMLSchema#decimal> ;`, `  ${(0, rdf_1.iri)(vocab_1.QCR.effectiveConversionOffset)} "${unit.offset}"^^<http://www.w3.org/2001/XMLSchema#decimal> .`, '');
            for (const code of [...unit.ucumCodes].sort()) {
                lines.push(`${(0, rdf_1.iri)(unit.iri)} ${(0, rdf_1.iri)(vocab_1.QCR.recognizedUcumCode)} "${(0, rdf_1.escapeLiteral)(code)}" .`);
            }
            if (unit.ucumCodes.length > 0)
                lines.push('');
        }
        return lines.join('\n');
    }
}
exports.QudtUnitIndex = QudtUnitIndex;
//# sourceMappingURL=qudt-index.js.map