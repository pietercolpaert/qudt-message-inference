"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataFactory = void 0;
exports.parseQuads = parseQuads;
exports.parseRdfMessageLog = parseRdfMessageLog;
exports.loadQuads = loadQuads;
exports.loadRdfMessageLog = loadRdfMessageLog;
exports.iri = iri;
exports.escapeLiteral = escapeLiteral;
exports.termToN3 = termToN3;
exports.quadToN3 = quadToN3;
exports.writeMessageLog = writeMessageLog;
const node_fs_1 = require("node:fs");
const rdf_parser_ts_1 = require("rdf-parser-ts");
Object.defineProperty(exports, "DataFactory", { enumerable: true, get: function () { return rdf_parser_ts_1.DataFactory; } });
function parseQuads(source) {
    const parser = new rdf_parser_ts_1.Parser({ factory: rdf_parser_ts_1.DataFactory });
    const parsed = (parser.parse(source) ?? []);
    const quads = [];
    for (const item of parsed) {
        quads.push(((0, rdf_parser_ts_1.isMessageQuad)(item) ? item.quad : item));
    }
    return quads;
}
function parseRdfMessageLog(source) {
    const parser = new rdf_parser_ts_1.Parser({ factory: rdf_parser_ts_1.DataFactory });
    const parsed = (parser.parse(source) ?? []);
    const grouped = new Map();
    let sawMessageMetadata = false;
    let maximumCounter = -1;
    for (const item of parsed) {
        if ((0, rdf_parser_ts_1.isMessageQuad)(item)) {
            sawMessageMetadata = true;
            const messageItem = item;
            const counter = messageItem.messageCounter ?? messageItem.message ?? 0;
            maximumCounter = Math.max(maximumCounter, counter);
            const message = grouped.get(counter) ?? [];
            message.push(messageItem.quad);
            grouped.set(counter, message);
        }
        else {
            const message = grouped.get(0) ?? [];
            message.push(item);
            grouped.set(0, message);
            maximumCounter = Math.max(maximumCounter, 0);
        }
    }
    if (!sawMessageMetadata)
        return grouped.size === 0 ? [] : [grouped.get(0) ?? []];
    const declaredCount = parsed.messageCount;
    const count = declaredCount ?? maximumCounter + 1;
    const messages = [];
    for (let index = 0; index < count; index += 1) {
        messages.push(grouped.get(index) ?? []);
    }
    return messages;
}
function loadQuads(path) {
    return parseQuads((0, node_fs_1.readFileSync)(path, 'utf8'));
}
function loadRdfMessageLog(path) {
    return parseRdfMessageLog((0, node_fs_1.readFileSync)(path, 'utf8'));
}
function iri(value) {
    return `<${value.replace(/>/g, '%3E')}>`;
}
function escapeLiteral(value) {
    return value
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');
}
function termToN3(term) {
    switch (term.termType) {
        case 'NamedNode':
            return iri(term.value);
        case 'BlankNode':
            return `_:${term.value}`;
        case 'Literal': {
            const lexical = `"${escapeLiteral(term.value)}"`;
            if (term.language)
                return `${lexical}@${term.language}`;
            return `${lexical}^^${iri(term.datatype.value)}`;
        }
        case 'Variable':
            return `?${term.value}`;
        case 'DefaultGraph':
            return '';
        default:
            throw new Error(`Unsupported RDF term type for N3 serialization: ${term.termType}`);
    }
}
function quadToN3(quad) {
    if (quad.graph.termType !== 'DefaultGraph') {
        throw new Error('Named-graph serialization is not supported by the compact helper.');
    }
    return `${termToN3(quad.subject)} ${termToN3(quad.predicate)} ${termToN3(quad.object)} .`;
}
function writeMessageLog(messages) {
    const lines = ['@version "1.2-messages" .', ''];
    messages.forEach((message, index) => {
        for (const quad of message)
            lines.push(quadToN3(quad));
        if (index < messages.length - 1)
            lines.push('', '@message .', '');
    });
    return `${lines.join('\n')}\n`;
}
//# sourceMappingURL=rdf.js.map