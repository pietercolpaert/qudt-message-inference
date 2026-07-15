(() => {
  'use strict';

  const data = window.QUDT_PLAYGROUND_DATA;
  if (!data || !Array.isArray(data.cases) || !Array.isArray(data.units)) {
    throw new Error('The generated playground corpus could not be loaded.');
  }

  const byId = (id) => document.getElementById(id);
  const select = byId('case-select');
  const rdfInput = byId('rdf-input');
  const shaclOutput = byId('shacl-output');
  const status = byId('status');
  const supportedCdtDatatypes = new Set(data.supportedCdtDatatypes ?? []);
  let selectedCase;

  const localName = (iri) => iri.slice(Math.max(iri.lastIndexOf('/'), iri.lastIndexOf('#')) + 1);
  const formatNumber = (value) => {
    if (!Number.isFinite(value)) return '—';
    if (Math.abs(value) < 1e-12) return '0';
    if (Math.abs(value) >= 1e9 || Math.abs(value) < 1e-6) return value.toExponential(8);
    return Number(value.toPrecision(12)).toLocaleString('en-US', { maximumSignificantDigits: 12 });
  };
  const closeEnough = (actual, expected) => {
    const tolerance = Math.max(1e-10, Math.abs(expected) * 1e-10);
    return Math.abs(actual - expected) <= tolerance;
  };
  const escapeTurtle = (value) => value.replaceAll('\\', '\\\\').replaceAll('"', '\\"');
  const unescapeTurtle = (value) => value
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');

  const prefixesFrom = (rdf) => {
    const prefixes = new Map([
      ['cdt', 'https://w3id.org/cdt/'],
      ['ex', 'https://example.org/'],
      ['qudt', 'http://qudt.org/schema/qudt/'],
      ['unit', 'http://qudt.org/vocab/unit/'],
      ['xsd', 'http://www.w3.org/2001/XMLSchema#'],
    ]);
    const pattern = /@prefix\s+([A-Za-z][\w-]*):\s*<([^>]+)>\s*\./g;
    for (const match of rdf.matchAll(pattern)) prefixes.set(match[1], match[2]);
    return prefixes;
  };

  const resolveTerm = (token, prefixes) => {
    const trimmed = token.trim();
    if (trimmed.startsWith('<') && trimmed.endsWith('>')) return trimmed.slice(1, -1);
    const colon = trimmed.indexOf(':');
    if (colon < 1) return undefined;
    const namespace = prefixes.get(trimmed.slice(0, colon));
    return namespace ? namespace + trimmed.slice(colon + 1) : undefined;
  };

  const findUnitByIri = (iri) => data.units.find((unit) => unit.iri === iri);
  const findUnitByUcum = (code) => data.units.find(
    (unit) => Array.isArray(unit.ucumCodes) && unit.ucumCodes.includes(code),
  );

  const parseOutputShape = (rdf) => {
    const prefixes = prefixesFrom(rdf);
    let quantityPath;
    let numericValuePath;
    let unitPath;
    let targetUnitIri;
    for (const match of rdf.matchAll(/\[([\s\S]*?)\]/g)) {
      const body = match[1];
      const pathToken = /\bsh:path\s+(<[^>]+>|[A-Za-z][\w-]*:[A-Za-z0-9_.~-]+)/.exec(body)?.[1];
      if (!pathToken) continue;
      const path = resolveTerm(pathToken, prefixes);
      if (!path) continue;
      if (/\bsh:node\b/.test(body)) quantityPath = path;
      const hasValueToken = /\bsh:hasValue\s+(<[^>]+>|[A-Za-z][\w-]*:[A-Za-z0-9_.~-]+)/.exec(body)?.[1];
      const unitToken = /\bsh:unit\s+(<[^>]+>|[A-Za-z][\w-]*:[A-Za-z0-9_.~-]+)/.exec(body)?.[1];
      if (hasValueToken) {
        unitPath = path;
        targetUnitIri = resolveTerm(hasValueToken, prefixes);
      } else if (unitToken) {
        numericValuePath = path;
        targetUnitIri ??= resolveTerm(unitToken, prefixes);
      }
    }
    if (!quantityPath || !numericValuePath || !unitPath || !targetUnitIri) {
      throw new Error('SHACL OUT must contain a result path, numeric path, unit path, and one target unit.');
    }
    const target = findUnitByIri(targetUnitIri);
    if (!target) throw new Error('The SHACL OUT target unit is not in the playground QUDT background.');
    return { quantityPath, numericValuePath, unitPath, target };
  };

  const parseInput = (rdf) => {
    const prefixes = prefixesFrom(rdf);
    const typedLiteralPattern = /"((?:\\.|[^"\\])*)"\s*\^\^\s*(<[^>]+>|[A-Za-z][\w-]*:[A-Za-z][\w-]*)/g;
    for (const match of rdf.matchAll(typedLiteralPattern)) {
      const datatype = resolveTerm(match[2], prefixes);
      if (!datatype || !supportedCdtDatatypes.has(datatype)) continue;
      const lexical = unescapeTurtle(match[1]);
      const parts = /^\s*([+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?)\s+(.+?)\s*$/.exec(lexical);
      if (!parts) throw new Error('The CDT literal must contain a number followed by a UCUM unit code.');
      const unit = findUnitByUcum(parts[2]);
      if (!unit) throw new Error(`No playground QUDT unit has UCUM code “${parts[2]}”.`);
      return { profile: 'CDT typed literal', value: Number(parts[1]), unit };
    }

    const numericMatch = /(?:\bqudt:numericValue|<http:\/\/qudt\.org\/schema\/qudt\/numericValue>)\s+"((?:\\.|[^"\\])*)"/.exec(rdf);
    const unitMatch = /(?:\bqudt:unit|<http:\/\/qudt\.org\/schema\/qudt\/unit>)\s+(<[^>]+>|[A-Za-z][\w-]*:[A-Za-z0-9_.~-]+)/.exec(rdf);
    if (!numericMatch || !unitMatch) {
      throw new Error('Could not find a supported QUDT numeric value and unit in the RDF Message.');
    }
    const value = Number(unescapeTurtle(numericMatch[1]));
    const unitIri = resolveTerm(unitMatch[1], prefixes);
    const unit = unitIri && findUnitByIri(unitIri);
    if (!Number.isFinite(value)) throw new Error('The QUDT numeric value is not a finite number.');
    if (!unit) throw new Error('The QUDT unit IRI is not in the playground background.');
    return { profile: 'Nested QUDT quantity', value, unit };
  };

  const observationFrom = (rdf) => {
    const match = /<([^>]+)>\s+(?:a\s+(?:[A-Za-z][\w-]*:Observation|<https:\/\/example\.org\/Observation>)|<http:\/\/www\.w3\.org\/1999\/02\/22-rdf-syntax-ns#type>)/.exec(rdf);
    return match ? match[1] : selectedCase.observation;
  };

  const outputRdf = (observation, targetValue, outputShape) =>
    `@prefix qudt: <http://qudt.org/schema/qudt/> .\n@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .\n\n<${observation}>\n  <${outputShape.quantityPath}> [\n    a qudt:QuantityValue ;\n    <${outputShape.numericValuePath}> "${escapeTurtle(String(targetValue))}"^^xsd:decimal ;\n    <${outputShape.unitPath}> <${outputShape.target.iri}>\n  ] .`;

  const showError = (error) => {
    const message = error instanceof Error ? error.message : String(error);
    status.className = 'status invalid';
    status.textContent = 'RDF needs attention';
    byId('editor-help').textContent = message;
    byId('output-rdf').textContent = `# ${message}`;
    byId('source-display').textContent = '—';
    byId('canonical-display').textContent = '—';
    byId('result-display').textContent = '—';
    byId('formula').textContent = 'No conversion was produced.';
  };

  const calculate = () => {
    try {
      const parsed = parseInput(rdfInput.value);
      const outputShape = parseOutputShape(shaclOutput.value);
      const target = outputShape.target;
      if (parsed.unit.dimensionVector !== target.dimensionVector) {
        throw new Error('The parsed source unit is not dimensionally compatible with this example’s target unit.');
      }
      const canonical = (parsed.value + parsed.unit.offset) * parsed.unit.multiplier;
      const result = canonical / target.multiplier - target.offset;
      const roundedResult = Number(result.toPrecision(15));
      if (!Number.isFinite(result)) throw new Error('The affine conversion did not produce a finite result.');

      const observation = observationFrom(rdfInput.value);
      byId('output-rdf').textContent = outputRdf(observation, roundedResult, outputShape);
      byId('source-display').textContent = `${formatNumber(parsed.value)} ${parsed.unit.symbol}`;
      byId('source-name').textContent = localName(parsed.unit.iri);
      byId('canonical-display').textContent = formatNumber(canonical);
      byId('result-display').textContent = `${formatNumber(result)} ${target.symbol}`;
      byId('target-name').textContent = localName(target.iri);
      byId('formula').textContent = `((${parsed.value} + ${parsed.unit.offset}) × ${parsed.unit.multiplier}) ÷ ${target.multiplier} − ${target.offset} = ${formatNumber(result)}`;
      byId('observation').textContent = observation;
      byId('input-profile').textContent = parsed.profile;
      byId('source-unit').textContent = parsed.unit.iri;
      byId('source-affine').textContent = `${parsed.unit.multiplier} / ${parsed.unit.offset}`;
      byId('target-unit').textContent = target.iri;
      byId('target-affine').textContent = `${target.multiplier} / ${target.offset}`;
      byId('editor-help').innerHTML = 'Edit the full RDF above, then run again. CDT unit extraction is implemented by <code>string:scrape</code> in the tested N3 engine.';

      const isFixture =
        parsed.unit.iri === selectedCase.source.iri &&
        target.iri === selectedCase.target.iri &&
        closeEnough(parsed.value, Number(selectedCase.sourceValue)) &&
        closeEnough(result, Number(selectedCase.expectedValue));
      status.className = isFixture ? 'status' : 'status live';
      status.textContent = isFixture ? 'Example matches' : 'Live conversion';
    } catch (error) {
      showError(error);
    }
  };

  const chooseCase = (id) => {
    selectedCase = data.cases.find((testCase) => testCase.id === id) ?? data.cases[0];
    select.value = selectedCase.id;
    rdfInput.value = selectedCase.inputRdf;
    shaclOutput.value = selectedCase.outputShacl;
    byId('dimension').textContent = selectedCase.dimensionLabel;
    byId('expected-value').textContent = `${selectedCase.expectedValue} ${selectedCase.target.symbol}`;
    calculate();
  };

  const groups = new Map();
  for (const testCase of data.cases) {
    if (!groups.has(testCase.dimensionLabel)) groups.set(testCase.dimensionLabel, []);
    groups.get(testCase.dimensionLabel).push(testCase);
  }
  for (const [label, cases] of groups) {
    const group = document.createElement('optgroup');
    group.label = label;
    for (const testCase of cases) {
      const option = document.createElement('option');
      option.value = testCase.id;
      const typeLabel = testCase.representation === 'cdt-literal' ? 'CDT · ' : '';
      option.textContent = `${typeLabel}${testCase.sourceValue} ${testCase.source.symbol} → ${formatNumber(Number(testCase.expectedValue))} ${testCase.target.symbol}`;
      group.append(option);
    }
    select.append(group);
  }

  byId('case-count').textContent = String(data.totalCases);
  byId('unit-count').textContent = String(data.totalUnits);
  byId('dimension-count').textContent = String(data.dimensions);
  select.addEventListener('change', () => {
    chooseCase(select.value);
    window.history.replaceState(null, '', `#${encodeURIComponent(select.value)}`);
  });
  byId('run-conversion').addEventListener('click', calculate);
  rdfInput.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      calculate();
    }
  });
  shaclOutput.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      calculate();
    }
  });
  const requestedId = decodeURIComponent(window.location.hash.slice(1));
  chooseCase(data.cases.some((testCase) => testCase.id === requestedId) ? requestedId : data.cases[0].id);
})();
