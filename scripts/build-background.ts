import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadQuads, QudtUnitIndex } from '../src';

const [, , qudtPathArgument, outputPathArgument] = process.argv;
if (!qudtPathArgument || !outputPathArgument) {
  console.error(
    'Usage: npm run build:background -- <QUDT units Turtle file> <output N3 file>',
  );
  process.exitCode = 1;
} else {
  const qudtPath = resolve(qudtPathArgument);
  const outputPath = resolve(outputPathArgument);
  const quads = loadQuads(qudtPath);
  const index = new QudtUnitIndex(quads);
  const rule = readFileSync(resolve(__dirname, '../../rules/qudt-conversion.n3'), 'utf8');
  const source = readFileSync(qudtPath, 'utf8');
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
  writeFileSync(outputPath, combined, 'utf8');
  console.log(`Wrote ${index.size} usable QUDT unit definitions to ${outputPath}`);
}
