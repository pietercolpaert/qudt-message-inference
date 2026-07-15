# QUDT Message Inference

A TypeScript/RDFJS prototype that normalizes QUDT quantity values in RDF Message Streams. It uses:

- **SHACL IN** as a trusted description of the units and graph path that may arrive;
- **QUDT** as background knowledge for dimensions, conversion multipliers, and offsets;
- a generic **backward N3 rule** executed by **Eyeling**;
- **SHACL OUT** to choose the output graph path and target unit;
- RDF Message logs as the test and streaming boundary.

The project is deliberately an execution profile over QUDT, not a competing unit vocabulary.

## Status and scope

Version 0.1 supports QUDT affine conversions of the form:

```text
canonical = (source + sourceOffset) * sourceMultiplier
target    = canonical / targetMultiplier - targetOffset
```

A conversion is allowed only when source and target units have the same `qudt:hasDimensionVector`.

This covers common scale conversions, affine absolute-temperature conversions, and compound units that QUDT already expresses with a multiplier, for example metres/second to kilometres/hour. It does not claim support for logarithmic, reciprocal, contextual, calendar-dependent, currency, or other non-affine conversions. Temperature fixtures represent absolute temperatures, not temperature intervals.

## Requirements

- Node.js 24 or newer
- npm

`rdf-parser-ts` currently requires Node.js 24.

## Install and test

```bash
npm install
npm test
```

The test corpus contains **73 RDF Messages using 73 curated QUDT units across 13 dimensions**:

| Dimension | Target unit | Cases |
|---|---:|---:|
| Length | metre | 10 |
| Time | second | 6 |
| Speed | kilometre/hour | 5 |
| Mass | kilogram | 7 |
| Absolute temperature | degree Celsius | 4 |
| Area | square metre | 7 |
| Volume | litre | 7 |
| Pressure | pascal | 6 |
| Energy | joule | 7 |
| Power | watt | 4 |
| Plane angle | radian | 4 |
| Acceleration | metre/second² | 3 |
| Density | kilogram/metre³ | 3 |

Each dimension has:

```text
tests/fixtures/shapes/<dimension>-in.ttl
tests/fixtures/shapes/<dimension>-out.ttl
tests/fixtures/logs/<dimension>.trig
tests/fixtures/manifests/<dimension>.json
```

The JSON manifests are independent numerical oracles for the expected converted values.

## API

```ts
import {
  QudtMessageInferenceEngine,
  loadQuads,
  loadRdfMessageLog,
} from 'qudt-message-inference';

const engine = new QudtMessageInferenceEngine({
  shaclIn: loadQuads('input-shape.ttl'),
  backgroundKnowledge: loadQuads('qudt-units.ttl'),
});

console.log(engine.getPlanSummary());

const messages = loadRdfMessageLog('messages.trig');
for await (const result of engine.infer(loadQuads('output-shape.ttl'), messages)) {
  console.log(result.messageIndex, result.conversions, result.diagnostics);
  // result.quads is the inferred RDF Message.
}
```

### Constructor planning

The constructor compiles SHACL IN and indexes the QUDT background. SHACL IN must enumerate the possible source-unit IRIs using one or more of:

- `sh:in` on the quantity's `qudt:unit` property shape;
- `sh:hasValue` on that property shape;
- `sh:unit` on the numeric property shape.

The engine retains only QUDT unit definitions in dimensions reachable from those source units. This is the load-time pruning stage. It assumes that SHACL IN is a trusted producer contract; it is not inferred from arbitrary instance data.

### `infer(shaclOut, messages)`

SHACL OUT must select exactly one target QUDT unit using `sh:unit` and/or `sh:hasValue`. Before reading the stream, the engine:

1. resolves the target unit in QUDT;
2. rejects a target whose dimension is absent from SHACL IN;
3. retains only source units dimensionally compatible with the target;
4. compiles an Eyeling program containing the generic backward rule, selected QUDT facts, and a forward trigger generated from the SHACL paths.

Every input message is reasoned over independently. By default the result preserves the original message and adds a normalized `qudt:QuantityValue` at the output path. The new value includes provenance through `prov:wasDerivedFrom` and the local execution-profile vocabulary.

## Supported SHACL pattern

The prototype intentionally accepts one nested quantity mapping per shape graph:

```turtle
ex:InputShape a sh:NodeShape ;
  sh:targetClass ex:Observation ;
  sh:property [
    sh:path ex:quantity ;
    sh:node ex:InputQuantityShape
  ] .

ex:InputQuantityShape a sh:NodeShape ;
  sh:property [
    sh:path qudt:numericValue ;
    sh:datatype xsd:decimal
  ] ;
  sh:property [
    sh:path qudt:unit ;
    sh:in ( unit:M unit:CentiM unit:FT )
  ] .
```

An output shape uses a separate result path and a single target unit:

```turtle
ex:OutputShape a sh:NodeShape ;
  sh:targetClass ex:Observation ;
  sh:property [
    sh:path ex:normalizedQuantity ;
    sh:node ex:OutputQuantityShape
  ] .

ex:OutputQuantityShape a sh:NodeShape ;
  sh:property [
    sh:path qudt:numericValue ;
    sh:datatype xsd:decimal ;
    sh:unit unit:M
  ] ;
  sh:property [
    sh:path qudt:unit ;
    sh:hasValue unit:M
  ] .
```

Only simple IRI paths are supported in version 0.1. General SHACL property paths, multiple independent quantities, lists of output units, and in-place graph replacement are future work.

## Backward rule

`rules/qudt-conversion.n3` defines the demanded predicate:

```n3
(?sourceValue ?sourceUnit ?targetUnit)
  qcr:convertedValue ?targetValue .
```

It is a backward rule (`<=`). The SHACL compiler generates a narrow forward trigger for the selected input and output paths. That trigger asks for the backward predicate only for quantities found in each incoming message.

Missing QUDT offsets are normalized to zero as `qcr:effectiveConversionOffset` facts by the JavaScript planner. This avoids relying on negation-as-failure inside the arithmetic rule.

## One large background-knowledge file

The runtime normally compiles a smaller per-shape program. For inspection, reuse, or importing into a larger N3 background, generate one file containing:

- the supplied QUDT Turtle;
- effective multiplier/offset facts;
- the generic backward rule.

```bash
npm run build:background -- \
  background/qudt-mini.ttl \
  background/qudt-conversion-background.n3
```

A generated file for the included 73-unit corpus is committed at `background/qudt-conversion-background.n3`.

For production use, pass an official QUDT units distribution rather than the curated test subset. The builder retains only units that have a finite non-zero `qudt:conversionMultiplier` and an IRI-valued `qudt:hasDimensionVector`.

## Example

```bash
npm run example
```

The example normalizes a short RDF Message log containing metre, millimetre, centimetre, and decimetre observations into metres.

## Architecture

```text
QUDT graph ──────────────┐
                         ├─ constructor ─ SHACL-IN plan / pruned unit index
SHACL IN ────────────────┘

SHACL OUT ─ infer() ─ target-specific Eyeling program
                         │
RDF Message Stream ──────┴─ per-message backward conversion ─ RDF Message Stream
```

The JavaScript layer performs graph construction and diagnostics. Eyeling performs the numerical entailment. This keeps the N3 rule generic while allowing RDFJS callers to control output paths and streaming behavior.

## Diagnostics and safety properties

The engine reports per-message diagnostics for:

- missing numeric values;
- missing or non-IRI unit terms;
- source units outside SHACL IN;
- source units incompatible with the requested target;
- absent Eyeling conversion results.

A globally incompatible SHACL OUT throws `IncompatibleDimensionError` before stream processing begins.

Dimension equality prevents nonsensical conversions such as metre to second, but dimensional equality alone is not always sufficient to establish semantic substitutability. For example, dimensionally equivalent quantity kinds may still represent distinct concepts. A production profile should decide whether to add quantity-kind constraints for its domain.

## Repository layout

```text
background/     curated QUDT graph and generated combined N3 background
rules/          generic backward N3 conversion rule
src/            planner, compiler, stream engine, RDF helpers
examples/       runnable SHACL/RDF Message example
tests/          planning tests and 73-message conversion corpus
scripts/        combined-background generator
```

## License and data note

The project source is MIT-licensed. `background/qudt-mini.ttl` is a hand-curated interoperability fixture derived from publicly documented QUDT unit semantics and is not a replacement for, or redistribution of, the complete QUDT vocabularies. Review QUDT's own terms when distributing official QUDT data with an application.
