import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { QudtUnitIndex } from '../src/qudt-index';
import { loadQuads } from '../src/rdf';

interface TestCase {
  readonly observation: string;
  readonly sourceUnit: string;
  readonly targetUnit: string;
  readonly sourceValue: string;
  readonly expectedValue: string;
}

interface DimensionManifest {
  readonly dimension: string;
  readonly targetUnit: string;
  readonly caseCount: number;
  readonly cases: readonly TestCase[];
}

interface CorpusManifest {
  readonly dimensions: readonly {
    readonly name: string;
    readonly targetUnit: string;
    readonly messages: number;
  }[];
  readonly totalUnits: number;
  readonly totalMessages: number;
}

const dimensionLabels: Readonly<Record<string, string>> = {
  acceleration: 'Acceleration',
  angle: 'Plane angle',
  area: 'Area',
  density: 'Density',
  energy: 'Energy',
  length: 'Length',
  mass: 'Mass',
  power: 'Power',
  pressure: 'Pressure',
  speed: 'Speed',
  temperature: 'Absolute temperature',
  time: 'Time',
  volume: 'Volume',
};

const root = resolve(__dirname, '../..');
const fixtureRoot = join(root, 'tests', 'fixtures');
const sourceRoot = join(root, 'playground');
const destinationRoot = join(root, 'dist', 'playground');
const corpus = JSON.parse(
  readFileSync(join(fixtureRoot, 'manifests', 'all.json'), 'utf8'),
) as CorpusManifest;
const units = new QudtUnitIndex(loadQuads(join(root, 'background', 'qudt-mini.ttl')));

const cases = corpus.dimensions.flatMap((dimension) => {
  const manifest = JSON.parse(
    readFileSync(join(fixtureRoot, 'manifests', `${dimension.name}.json`), 'utf8'),
  ) as DimensionManifest;

  if (manifest.caseCount !== manifest.cases.length) {
    throw new Error(`${dimension.name} manifest case count does not match its cases.`);
  }

  return manifest.cases.map((testCase, index) => {
    const source = units.require(testCase.sourceUnit);
    const target = units.require(testCase.targetUnit);
    if (source.dimensionVector !== target.dimensionVector) {
      throw new Error(`${testCase.sourceUnit} cannot be converted to ${testCase.targetUnit}.`);
    }
    return {
      id: `${dimension.name}-${String(index + 1).padStart(2, '0')}`,
      dimension: dimension.name,
      dimensionLabel: dimensionLabels[dimension.name] ?? dimension.name,
      observation: testCase.observation,
      sourceValue: testCase.sourceValue,
      expectedValue: testCase.expectedValue,
      source: {
        iri: source.iri,
        symbol: source.symbol ?? source.iri.split('/').pop() ?? source.iri,
        multiplier: source.multiplier,
        offset: source.offset,
      },
      target: {
        iri: target.iri,
        symbol: target.symbol ?? target.iri.split('/').pop() ?? target.iri,
        multiplier: target.multiplier,
        offset: target.offset,
      },
    };
  });
});

if (cases.length !== corpus.totalMessages) {
  throw new Error(`Built ${cases.length} playground cases; expected ${corpus.totalMessages}.`);
}

mkdirSync(destinationRoot, { recursive: true });
for (const file of ['index.html', 'app.js', 'styles.css', '.nojekyll']) {
  copyFileSync(join(sourceRoot, file), join(destinationRoot, file));
}
writeFileSync(
  join(destinationRoot, 'cases.js'),
  `window.QUDT_PLAYGROUND_DATA = ${JSON.stringify(
    {
      totalUnits: corpus.totalUnits,
      totalCases: cases.length,
      dimensions: corpus.dimensions.length,
      cases,
    },
    null,
    2,
  )};\n`,
);

