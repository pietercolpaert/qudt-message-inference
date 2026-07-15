#!/usr/bin/env node

const { mkdirSync, writeFileSync } = require('node:fs');
const { dirname, resolve } = require('node:path');

const sourceUrl = process.argv[2] ?? process.env.QUDT_URL ?? 'https://qudt.org/qudt-all';
const outputPath = resolve(
  process.argv[3] ?? process.env.QUDT_PATH ?? 'background/qudt.ttl',
);

async function main() {
  const response = await fetch(sourceUrl, {
    headers: { Accept: 'text/turtle' },
    redirect: 'follow',
  });
  if (!response.ok) {
    throw new Error(`QUDT download failed with HTTP ${response.status} ${response.statusText}.`);
  }
  const source = await response.text();
  const requiredTerms = [
    'qudt:conversionMultiplier',
    'qudt:hasDimensionVector',
    'unit:CentiM-PER-SEC',
  ];
  for (const term of requiredTerms) {
    if (!source.includes(term)) throw new Error(`Downloaded graph is missing ${term}.`);
  }
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, source, 'utf8');
  console.log(`Wrote ${(Buffer.byteLength(source) / 1_000_000).toFixed(2)} MB from ${sourceUrl} to ${outputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
