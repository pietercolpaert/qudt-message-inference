"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = require("node:path");
const src_1 = require("../../src");
async function main() {
    const root = (0, node_path_1.resolve)(__dirname, '../../..');
    const example = (0, node_path_1.join)(root, 'examples', 'normalize-length');
    const engine = new src_1.QudtMessageInferenceEngine({
        shaclIn: (0, src_1.loadQuads)((0, node_path_1.join)(example, 'input-shape.ttl')),
        backgroundKnowledge: (0, src_1.loadQuads)((0, node_path_1.join)(root, 'background', 'qudt-mini.ttl')),
    });
    const messages = (0, src_1.loadRdfMessageLog)((0, node_path_1.join)(example, 'messages.trig'));
    const inferred = await (0, src_1.collectMessages)(engine.infer((0, src_1.loadQuads)((0, node_path_1.join)(example, 'output-shape.ttl')), messages));
    console.error('Planner:', engine.getPlanSummary());
    console.log((0, src_1.inferredMessagesToLog)(inferred));
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
//# sourceMappingURL=run.js.map