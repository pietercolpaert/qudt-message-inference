"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileInputShape = compileInputShape;
exports.compileOutputShape = compileOutputShape;
const graph_1 = require("./graph");
const vocab_1 = require("./vocab");
function requireNamedNode(term, context) {
    if (!term || term.termType !== 'NamedNode') {
        throw new Error(`${context} must be a simple IRI path or IRI value.`);
    }
    return term.value;
}
function isNumericPropertyShape(quads, propertyShape) {
    const path = (0, graph_1.firstObject)(quads, propertyShape, vocab_1.SH.path);
    if (path?.termType === 'NamedNode' && path.value === vocab_1.QUDT.numericValue)
        return true;
    const datatype = (0, graph_1.firstObject)(quads, propertyShape, vocab_1.SH.datatype);
    if (datatype?.termType === 'NamedNode' && vocab_1.NUMERIC_DATATYPES.has(datatype.value))
        return true;
    return (0, graph_1.objects)(quads, propertyShape, vocab_1.SH.unit).length > 0;
}
function isUnitPropertyShape(quads, propertyShape) {
    const path = (0, graph_1.firstObject)(quads, propertyShape, vocab_1.SH.path);
    if (path?.termType === 'NamedNode' && path.value === vocab_1.QUDT.unit)
        return true;
    return ((0, graph_1.objects)(quads, propertyShape, vocab_1.SH.in).length > 0 ||
        (0, graph_1.objects)(quads, propertyShape, vocab_1.SH.hasValue).some((term) => term.termType === 'NamedNode'));
}
function collectUnitTerms(quads, numericShape, unitShape) {
    const unitMap = new Map();
    for (const term of (0, graph_1.objects)(quads, numericShape, vocab_1.SH.unit)) {
        unitMap.set((0, graph_1.termKey)(term), term);
    }
    for (const term of (0, graph_1.objects)(quads, unitShape, vocab_1.SH.hasValue)) {
        unitMap.set((0, graph_1.termKey)(term), term);
    }
    for (const listHead of (0, graph_1.objects)(quads, unitShape, vocab_1.SH.in)) {
        for (const term of (0, graph_1.readRdfList)(quads, listHead))
            unitMap.set((0, graph_1.termKey)(term), term);
    }
    return [...unitMap.values()];
}
function compileSkeleton(shapes) {
    const nodeShapes = (0, graph_1.subjects)(shapes, vocab_1.RDF.type).filter((subject) => shapes.some((quad) => quad.subject.termType === subject.termType &&
        quad.subject.value === subject.value &&
        quad.predicate.value === vocab_1.RDF.type &&
        quad.object.termType === 'NamedNode' &&
        quad.object.value === vocab_1.SH.NodeShape));
    const candidates = [];
    for (const rootShape of nodeShapes) {
        const targetClasses = (0, graph_1.objects)(shapes, rootShape, vocab_1.SH.targetClass)
            .filter((term) => term.termType === 'NamedNode')
            .map((term) => term.value);
        for (const rootPropertyShape of (0, graph_1.objects)(shapes, rootShape, vocab_1.SH.property)) {
            const nestedShape = (0, graph_1.firstObject)(shapes, rootPropertyShape, vocab_1.SH.node);
            if (!nestedShape)
                continue;
            const quantityPath = requireNamedNode((0, graph_1.firstObject)(shapes, rootPropertyShape, vocab_1.SH.path), 'The root quantity sh:path');
            const nestedPropertyShapes = (0, graph_1.objects)(shapes, nestedShape, vocab_1.SH.property);
            const numericCandidates = nestedPropertyShapes.filter((term) => isNumericPropertyShape(shapes, term));
            const unitCandidates = nestedPropertyShapes.filter((term) => isUnitPropertyShape(shapes, term));
            if (numericCandidates.length !== 1 || unitCandidates.length !== 1)
                continue;
            const numericShape = numericCandidates[0];
            const unitShape = unitCandidates[0];
            candidates.push({
                targetClasses,
                quantityPath,
                numericValuePath: requireNamedNode((0, graph_1.firstObject)(shapes, numericShape, vocab_1.SH.path), 'The numeric value sh:path'),
                unitPath: requireNamedNode((0, graph_1.firstObject)(shapes, unitShape, vocab_1.SH.path), 'The unit sh:path'),
                unitTerms: collectUnitTerms(shapes, numericShape, unitShape),
            });
        }
    }
    if (candidates.length === 0) {
        throw new Error('No supported nested quantity shape was found. Expected a root sh:property/sh:node structure with one numeric property and one unit property.');
    }
    if (candidates.length > 1) {
        throw new Error(`Found ${candidates.length} supported quantity mappings. Version 0.1 accepts exactly one mapping per SHACL graph.`);
    }
    return candidates[0];
}
function compileInputShape(shapes) {
    const skeleton = compileSkeleton(shapes);
    const allowedUnits = new Set();
    for (const term of skeleton.unitTerms) {
        if (term.termType !== 'NamedNode') {
            throw new Error('This execution profile currently requires QUDT unit IRIs in sh:unit, sh:hasValue, or sh:in.');
        }
        allowedUnits.add(term.value);
    }
    if (allowedUnits.size === 0) {
        throw new Error('SHACL IN must enumerate possible source units with sh:in, sh:hasValue, or sh:unit so that the background can be pruned safely.');
    }
    return {
        targetClasses: skeleton.targetClasses,
        quantityPath: skeleton.quantityPath,
        numericValuePath: skeleton.numericValuePath,
        unitPath: skeleton.unitPath,
        allowedUnits,
    };
}
function compileOutputShape(shapes) {
    const skeleton = compileSkeleton(shapes);
    const targetUnits = skeleton.unitTerms.filter((term) => term.termType === 'NamedNode');
    if (targetUnits.length !== 1) {
        throw new Error(`SHACL OUT must identify exactly one target QUDT unit IRI; found ${targetUnits.length}.`);
    }
    return {
        targetClasses: skeleton.targetClasses,
        quantityPath: skeleton.quantityPath,
        numericValuePath: skeleton.numericValuePath,
        unitPath: skeleton.unitPath,
        targetUnit: targetUnits[0].value,
    };
}
//# sourceMappingURL=shacl-plan.js.map