(() => {
  'use strict';

  const data = window.QUDT_PLAYGROUND_DATA;
  if (!data || !Array.isArray(data.cases)) {
    throw new Error('The generated playground corpus could not be loaded.');
  }

  const byId = (id) => document.getElementById(id);
  const select = byId('case-select');
  const valueInput = byId('source-value');
  const status = byId('status');
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

  const renderRdf = (testCase, sourceValue, targetValue) => {
    const observation = `<${testCase.observation}>`;
    const input = `@prefix qudt: <http://qudt.org/schema/qudt/> .\n@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .\n\n${observation}\n  <https://example.org/quantity> [\n    a qudt:QuantityValue ;\n    qudt:numericValue "${escapeTurtle(String(sourceValue))}"^^xsd:decimal ;\n    qudt:unit <${testCase.source.iri}>\n  ] .`;
    const output = `${observation}\n  <https://example.org/normalizedQuantity> [\n    a qudt:QuantityValue ;\n    qudt:numericValue "${escapeTurtle(String(targetValue))}"^^xsd:decimal ;\n    qudt:unit <${testCase.target.iri}>\n  ] .`;
    byId('input-rdf').textContent = input;
    byId('output-rdf').textContent = output;
  };

  const calculate = () => {
    const sourceValue = valueInput.value.trim() === '' ? Number.NaN : Number(valueInput.value);
    const source = selectedCase.source;
    const target = selectedCase.target;
    const canonical = (sourceValue + source.offset) * source.multiplier;
    const result = canonical / target.multiplier - target.offset;
    const fixtureValue = Number(selectedCase.sourceValue);
    const isFixtureInput = closeEnough(sourceValue, fixtureValue);
    const matchesFixture = closeEnough(result, Number(selectedCase.expectedValue));

    byId('source-display').textContent = `${formatNumber(sourceValue)} ${source.symbol}`;
    byId('canonical-display').textContent = formatNumber(canonical);
    byId('result-display').textContent = `${formatNumber(result)} ${target.symbol}`;
    byId('formula').textContent = `((${sourceValue} + ${source.offset}) × ${source.multiplier}) ÷ ${target.multiplier} − ${target.offset} = ${formatNumber(result)}`;
    renderRdf(selectedCase, sourceValue, Number(result.toPrecision(15)));

    status.className = 'status';
    if (isFixtureInput && matchesFixture) {
      status.textContent = 'Fixture matches';
    } else if (Number.isFinite(sourceValue)) {
      status.textContent = 'Live conversion';
      status.classList.add('live');
    } else {
      status.textContent = 'Enter a number';
      status.classList.add('invalid');
    }
  };

  const chooseCase = (id) => {
    selectedCase = data.cases.find((testCase) => testCase.id === id) ?? data.cases[0];
    const source = selectedCase.source;
    const target = selectedCase.target;
    valueInput.value = selectedCase.sourceValue;
    byId('source-symbol').textContent = source.symbol;
    byId('source-name').textContent = localName(source.iri);
    byId('target-name').textContent = localName(target.iri);
    byId('observation').textContent = selectedCase.observation;
    byId('dimension').textContent = selectedCase.dimensionLabel;
    byId('source-multiplier').textContent = String(source.multiplier);
    byId('source-offset').textContent = String(source.offset);
    byId('target-multiplier').textContent = String(target.multiplier);
    byId('target-offset').textContent = String(target.offset);
    byId('expected-value').textContent = `${selectedCase.expectedValue} ${target.symbol}`;
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
      option.textContent = `${testCase.sourceValue} ${testCase.source.symbol} → ${formatNumber(Number(testCase.expectedValue))} ${testCase.target.symbol}`;
      group.append(option);
    }
    select.append(group);
  }

  byId('case-count').textContent = String(data.totalCases);
  byId('unit-count').textContent = String(data.totalUnits);
  byId('dimension-count').textContent = String(data.dimensions);
  select.addEventListener('change', () => chooseCase(select.value));
  valueInput.addEventListener('input', calculate);
  byId('reset-value').addEventListener('click', () => {
    valueInput.value = selectedCase.sourceValue;
    calculate();
    valueInput.focus();
  });
  chooseCase(data.cases[0].id);
})();
