"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageStreamFromLog = messageStreamFromLog;
exports.messagesFromArrays = messagesFromArrays;
exports.collectMessages = collectMessages;
exports.inferredMessagesToLog = inferredMessagesToLog;
const rdf_1 = require("./rdf");
async function* messageStreamFromLog(source) {
    for (const message of (0, rdf_1.parseRdfMessageLog)(source))
        yield message;
}
async function* messagesFromArrays(messages) {
    for (const message of messages)
        yield message;
}
async function collectMessages(messages) {
    const collected = [];
    for await (const message of messages)
        collected.push(message);
    return collected;
}
function inferredMessagesToLog(messages) {
    return (0, rdf_1.writeMessageLog)(messages.map((message) => message.quads));
}
//# sourceMappingURL=message-stream.js.map