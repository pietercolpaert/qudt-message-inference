"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sameTerm = sameTerm;
exports.termKey = termKey;
exports.objects = objects;
exports.firstObject = firstObject;
exports.subjects = subjects;
exports.readRdfList = readRdfList;
exports.uniqueTerms = uniqueTerms;
const vocab_1 = require("./vocab");
function sameTerm(a, b) {
    if (a.termType !== b.termType || a.value !== b.value)
        return false;
    if (a.termType === 'Literal' && b.termType === 'Literal') {
        return a.language === b.language && a.datatype.value === b.datatype.value;
    }
    return true;
}
function termKey(term) {
    if (term.termType === 'Literal') {
        return `L|${term.value}|${term.language}|${term.datatype.value}`;
    }
    return `${term.termType}|${term.value}`;
}
function objects(quads, subject, predicateIri) {
    return quads
        .filter((quad) => sameTerm(quad.subject, subject) && quad.predicate.value === predicateIri)
        .map((quad) => quad.object);
}
function firstObject(quads, subject, predicateIri) {
    return quads.find((quad) => sameTerm(quad.subject, subject) && quad.predicate.value === predicateIri)?.object;
}
function subjects(quads, predicateIri, object) {
    const result = new Map();
    for (const quad of quads) {
        if (quad.predicate.value !== predicateIri)
            continue;
        if (object && !sameTerm(quad.object, object))
            continue;
        result.set(termKey(quad.subject), quad.subject);
    }
    return [...result.values()];
}
function readRdfList(quads, head) {
    if (head.termType === 'NamedNode' && head.value === vocab_1.RDF.nil)
        return [];
    const values = [];
    const visited = new Set();
    let cursor = head;
    while (cursor) {
        const key = termKey(cursor);
        if (visited.has(key)) {
            throw new Error('Cycle detected in RDF list.');
        }
        visited.add(key);
        if (cursor.termType === 'NamedNode' && cursor.value === vocab_1.RDF.nil)
            break;
        const first = firstObject(quads, cursor, vocab_1.RDF.first);
        const rest = firstObject(quads, cursor, vocab_1.RDF.rest);
        if (!first || !rest) {
            throw new Error(`Malformed RDF list at ${cursor.value || cursor.termType}.`);
        }
        values.push(first);
        cursor = rest;
    }
    return values;
}
function uniqueTerms(terms) {
    const map = new Map();
    for (const term of terms)
        map.set(termKey(term), term);
    return [...map.values()];
}
//# sourceMappingURL=graph.js.map