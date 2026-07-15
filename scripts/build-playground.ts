import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { QudtUnitIndex } from '../src/qudt-index';
import { loadQuads } from '../src/rdf';
import { CDT } from '../src/vocab';

interface TestCase {
  readonly observation: string;
  readonly sourceUnit: string;
  readonly targetUnit: string;
  readonly sourceValue: string;
  readonly expectedValue: string;
  readonly datatype?: string;
  readonly property?: string;
  readonly ucumCode?: string;
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
const unitIndex = new QudtUnitIndex([
  // Preserve the stable fixture values and aliases used by the executable corpus.
  ...loadQuads(join(root, 'background', 'qudt-mini.ttl')),
  ...loadQuads(join(root, 'background', 'qudt.ttl')),
]);

function escapeTurtle(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function inputRdf(testCase: TestCase): string {
  if (testCase.datatype && testCase.property && testCase.ucumCode) {
    return `@prefix ex: <https://example.org/> .\n\n<${testCase.observation}>\n  a ex:Observation ;\n  <${testCase.property}> "${escapeTurtle(`${testCase.sourceValue} ${testCase.ucumCode}`)}"^^<${testCase.datatype}> .`;
  }
  return `@prefix ex:   <https://example.org/> .\n@prefix qudt: <http://qudt.org/schema/qudt/> .\n@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .\n\n<${testCase.observation}>\n  a ex:Observation ;\n  ex:quantity [\n    a qudt:QuantityValue ;\n    qudt:numericValue "${escapeTurtle(testCase.sourceValue)}"^^xsd:decimal ;\n    qudt:unit <${testCase.sourceUnit}>\n  ] .`;
}

function outputShacl(testCase: TestCase): string {
  return `@prefix ex:   <https://example.org/> .\n@prefix qudt: <http://qudt.org/schema/qudt/> .\n@prefix sh:   <http://www.w3.org/ns/shacl#> .\n@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .\n\nex:OutputShape a sh:NodeShape ;\n  sh:targetClass ex:Observation ;\n  sh:property [\n    sh:path ex:normalizedQuantity ;\n    sh:node ex:OutputQuantityShape\n  ] .\n\nex:OutputQuantityShape a sh:NodeShape ;\n  sh:property [\n    sh:path qudt:numericValue ;\n    sh:datatype xsd:decimal ;\n    sh:unit <${testCase.targetUnit}>\n  ] ;\n  sh:property [\n    sh:path qudt:unit ;\n    sh:hasValue <${testCase.targetUnit}>\n  ] .`;
}

function buildCase(
  testCase: TestCase,
  id: string,
  dimension: string,
  dimensionLabel: string,
): object {
  const source = unitIndex.require(testCase.sourceUnit);
  const target = unitIndex.require(testCase.targetUnit);
  if (source.dimensionVector !== target.dimensionVector) {
    throw new Error(`${testCase.sourceUnit} cannot be converted to ${testCase.targetUnit}.`);
  }
  const representation = testCase.datatype ? 'cdt-literal' : 'qudt-quantity';
  return {
    id,
    dimension,
    dimensionLabel,
    representation,
    observation: testCase.observation,
    sourceValue: testCase.sourceValue,
    expectedValue: testCase.expectedValue,
    datatype: testCase.datatype,
    property: testCase.property,
    ucumCode: testCase.ucumCode,
    inputRdf: inputRdf(testCase),
    outputShacl: outputShacl(testCase),
    source: {
      iri: source.iri,
      symbol: source.symbol ?? source.iri.split('/').pop() ?? source.iri,
      dimensionVector: source.dimensionVector,
      multiplier: source.multiplier,
      offset: source.offset,
      ucumCodes: source.ucumCodes,
    },
    target: {
      iri: target.iri,
      symbol: target.symbol ?? target.iri.split('/').pop() ?? target.iri,
      dimensionVector: target.dimensionVector,
      multiplier: target.multiplier,
      offset: target.offset,
      ucumCodes: target.ucumCodes,
    },
  };
}

const structuredCases = corpus.dimensions.flatMap((dimension) => {
  const manifest = JSON.parse(
    readFileSync(join(fixtureRoot, 'manifests', `${dimension.name}.json`), 'utf8'),
  ) as DimensionManifest;
  if (manifest.caseCount !== manifest.cases.length) {
    throw new Error(`${dimension.name} manifest case count does not match its cases.`);
  }
  return manifest.cases.map((testCase, index) =>
    buildCase(
      testCase,
      `${dimension.name}-${String(index + 1).padStart(2, '0')}`,
      dimension.name,
      dimensionLabels[dimension.name] ?? dimension.name,
    ),
  );
});

if (structuredCases.length !== corpus.totalMessages) {
  throw new Error(
    `Built ${structuredCases.length} structured playground cases; expected ${corpus.totalMessages}.`,
  );
}

const literalCases = ['cdt-speed', 'cdt-ucum'].flatMap((fixtureName) => {
  const manifest = JSON.parse(
    readFileSync(join(fixtureRoot, 'manifests', `${fixtureName}.json`), 'utf8'),
  ) as DimensionManifest;
  if (manifest.caseCount !== manifest.cases.length) {
    throw new Error(`${fixtureName} manifest case count does not match its cases.`);
  }
  return manifest.cases.map((testCase, index) =>
    buildCase(
      testCase,
      `${fixtureName}-${String(index + 1).padStart(2, '0')}`,
      'speed',
      fixtureName === 'cdt-speed' ? 'Speed · cdt:speed literals' : 'Speed · cdt:ucum literals',
    ),
  );
});

const cases = [...structuredCases, ...literalCases];
const units = unitIndex.all().map((unit) => ({
  iri: unit.iri,
  symbol: unit.symbol ?? unit.iri.split('/').pop() ?? unit.iri,
  dimensionVector: unit.dimensionVector,
  multiplier: unit.multiplier,
  offset: unit.offset,
  ucumCodes: unit.ucumCodes,
}));

mkdirSync(destinationRoot, { recursive: true });
for (const file of ['index.html', 'app.js', 'styles.css', '.nojekyll']) {
  copyFileSync(join(sourceRoot, file), join(destinationRoot, file));
}
writeFileSync(
  join(destinationRoot, 'cases.js'),
  `window.QUDT_PLAYGROUND_DATA = ${JSON.stringify(
    {
      totalUnits: unitIndex.size,
      totalCases: cases.length,
      structuredCases: structuredCases.length,
      literalCases: literalCases.length,
      dimensions: corpus.dimensions.length,
      supportedCdtDatatypes: [...CDT.supported].sort(),
      units,
      cases,
    },
    null,
    2,
  )};\n`,
);
