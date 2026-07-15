"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const src_1 = require("../src");
const [, , qudtPathArgument, outputPathArgument] = process.argv;
if (!qudtPathArgument || !outputPathArgument) {
    console.error('Usage: npm run build:background -- <QUDT units Turtle file> <output N3 file>');
    process.exitCode = 1;
}
else {
    const qudtPath = (0, node_path_1.resolve)(qudtPathArgument);
    const outputPath = (0, node_path_1.resolve)(outputPathArgument);
    const quads = (0, src_1.loadQuads)(qudtPath);
    const index = new src_1.QudtUnitIndex(quads);
    const rule = (0, node_fs_1.readFileSync)((0, node_path_1.resolve)(__dirname, '../../rules/qudt-conversion.n3'), 'utf8');
    const source = (0, node_fs_1.readFileSync)(qudtPath, 'utf8');
    const combined = [
        '# Generated QUDT conversion background for Eyeling.',
        '# It contains the source QUDT graph, normalized effective offset facts,',
        '# and the generic backward conversion rule.',
        '',
        source.trim(),
        '',
        '# Effective affine facts. Missing QUDT offsets are normalized to zero.',
        index.serializeEffectiveFacts(index.all()).trim(),
        '',
        rule.trim(),
        '',
    ].join('\n');
    (0, node_fs_1.writeFileSync)(outputPath, combined, 'utf8');
    console.log(`Wrote ${index.size} usable QUDT unit definitions to ${outputPath}`);
}
//# sourceMappingURL=build-background.js.map