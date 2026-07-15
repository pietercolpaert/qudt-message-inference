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

Version 0.1 also accepts direct literals typed as `cdt:ucum` or `cdt:speed`. Both the
original namespace (`http://w3id.org/lindt/custom_datatypes#`) and the shorter
`https://w3id.org/cdt/` namespace are recognized. Eyeling extracts the number and UCUM
code from the lexical form with N3 built-ins, then matches the code to QUDT's
`qudt:ucumCode`. The JavaScript layer does not parse the CDT lexical form or calculate its
value; it plans the trusted unit subset and constructs the inferred RDF Message from N3
results. Output remains a normalized nested `qudt:QuantityValue`.

## Planned conversion coverage

The current affine profile is a first step rather than a claim to implement every
conversion or scale represented by QUDT. We plan to add conversion profiles incrementally,
with explicit capability checks instead of silently treating every unit as affine.

Planned areas include:

- broader affine coverage from the official QUDT distribution;
- logarithmic conversions such as bel, decibel, neper, octave, decade, and pH;
- reciprocal conversions such as period to frequency;
- calendar-aware durations, including variable month and year lengths;
- currency and other conversions whose values change over time;
- contextual units that depend on a substance, reference temperature or pressure,
  location, calibration, or another observation;
- empirical, piecewise, and lookup-table transformations;
- correct separation of absolute quantities from delta quantities, especially
  absolute temperature versus temperature difference;
- quantity-kind compatibility in addition to dimension-vector compatibility;
- deriving conversions from prefixes and factor-unit structure when no complete
  multiplier is supplied; and
- uncertainty and provenance propagation through a conversion.

Nominal, ordinal, and enumeration scales are represented by QUDT but are not ordinary
numeric unit conversions. Cross-dimension calculations such as mass to volume using
density are likewise domain transformations. These may use the same planning and rule
infrastructure, but should remain distinguishable from unit conversion.

### Runtime conversion context

Some context is stable enough to be part of a specific QUDT unit definition. For example,
a contextual unit may identify fixed reference temperature and pressure conditions and
publish a conversion multiplier for precisely those conditions. Such a unit can be used by
the affine profile when the required metadata is explicit.

Other conversions depend on the state of the world or on the message being processed. An
exchange rate needs currencies, an effective time, and a rate source; a calendar conversion
needs a calendar and reference date; a gas-volume conversion may need temperature,
pressure, composition, and a reference standard. A substance-dependent unit needs the
substance to be identified. These inputs cannot be recovered from a dimension vector or a
static multiplier.

QUDT provides useful modeling hooks, including `qudt:ContextualUnit`, `qudt:Rule`,
`qudt:hasReciprocalUnit`, scale types, and `qudt:permissibleTransformation`. These can be
reused when describing future conversion profiles. QUDT does not, however, prescribe a
complete runtime protocol for supplying changing contextual values to a conversion engine.
See the [current QUDT schema](https://www.qudt.org/doc/DOC_SCHEMA-QUDT.html) and
[QUDT reference explorer](https://qudt.org/tools/qudt-reference-explorer/).

We therefore plan to let callers provide a conversion-context RDF graph alongside the
messages and SHACL shapes. It will likely carry contextual values, observation/effective
times, validity intervals, data providers, reference conditions, and provenance. The exact
vocabulary, conflict-resolution rules, reproducibility requirements, and API are not yet
fully designed. Until they are, the engine must reject conversions that require unavailable
or ambiguous context rather than guess a value.

## Requirements

- Node.js 24 or newer
- npm

`rdf-parser-ts` currently requires Node.js 24.

## Install and test

```bash
npm install
npm test
```

## Browser playground

The static [QUDT unit conversion playground](https://pietercolpaert.github.io/qudt-message-inference/)
contains a selectable dropdown for all 73 structured conversion cases plus five CDT
literal examples. The complete input RDF is the primary editable surface, and the page
shows the normalized RDF and affine calculation. The dependency-free browser parser is a
preview; the test suite runs the same fixtures through Eyeling and the N3 rules.

Run it locally without adding a web-server dependency:

```bash
npm run playground
```

The build generates `dist/playground/` from the JSON manifests and QUDT metadata. GitHub
Pages deploys that committed artifact from `main`; set the repository's Pages source to
**GitHub Actions** before the first deployment.

The structured baseline corpus contains **73 RDF Messages using 73 curated QUDT units
across 13 dimensions**. Five additional RDF Messages exercise the CDT literal input
profile:

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
The literal fixtures use the same layout with the `cdt-speed` and `cdt-ucum` names.

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
- `sh:unit` on the numeric property shape; or
- `sh:unit` on a direct `cdt:ucum`/`cdt:speed` property shape.

The engine retains only QUDT unit definitions in dimensions reachable from those source units. This is the load-time pruning stage. It assumes that SHACL IN is a trusted producer contract; it is not inferred from arbitrary instance data.

### `infer(shaclOut, messages)`

SHACL OUT must select exactly one target QUDT unit using `sh:unit` and/or `sh:hasValue`. Before reading the stream, the engine:

1. resolves the target unit in QUDT;
2. rejects a target whose dimension is absent from SHACL IN;
3. retains only source units dimensionally compatible with the target;
4. compiles an Eyeling program containing the generic backward rule, selected QUDT facts, and a forward trigger generated from the SHACL paths.

Every input message is reasoned over independently. By default the result preserves the original message and adds a normalized `qudt:QuantityValue` at the output path. The new value includes provenance through `prov:wasDerivedFrom` and the local execution-profile vocabulary.

## Supported SHACL pattern

The prototype accepts one input mapping per shape graph. It can be a nested quantity:

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

Alternatively, a direct CDT literal property can enumerate the QUDT units whose UCUM
codes are accepted by the trusted producer contract:

```turtle
@prefix cdt: <https://w3id.org/cdt/> .

ex:InputShape a sh:NodeShape ;
  sh:targetClass ex:Observation ;
  sh:property [
    sh:path ex:speed ;
    sh:datatype cdt:speed ;
    sh:unit unit:M-PER-SEC,
      unit:KiloM-PER-HR,
      unit:MI-PER-HR
  ] .
```

The corresponding RDF can put the unit directly in the literal:

```turtle
ex:observation a ex:Observation ;
  ex:speed "12 m/s"^^cdt:speed .
```

Generic `cdt:ucum` input uses the same pattern. A lexical form must contain a finite
decimal/scientific-notation number, whitespace, and a UCUM code that matches a
`qudt:ucumCode` on one of the `sh:unit` values. The shipped fixtures cover `m/s`, `km/h`,
`[mi_i]/h`, `[ft_i]/s`, and `[kn_i]`. The N3 rule uses Eyeling's `dt:datatype`,
`dt:lexicalForm`, `string:scrape`, and `log:dtlit` built-ins; malformed or unmapped values
produce an `INVALID_CDT_LITERAL` diagnostic.

An output shape uses a separate result path and a single target unit. For the direct speed
example above, it can normalize to kilometres/hour:

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
    sh:unit unit:KiloM-PER-HR
  ] ;
  sh:property [
    sh:path qudt:unit ;
    sh:hasValue unit:KiloM-PER-HR
  ] .
```

Only simple IRI paths are supported in version 0.1. General SHACL property paths, multiple independent quantities or direct literal properties, lists of output units, and in-place graph replacement are future work.

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

The JavaScript layer performs planning, graph construction, and diagnostics. Eyeling
performs numerical entailment and, for CDT input, lexical parsing and UCUM-unit matching.
This keeps the N3 rule generic while allowing RDFJS callers to control output paths and
streaming behavior.

## Diagnostics and safety properties

The engine reports per-message diagnostics for:

- missing numeric values;
- missing or non-IRI unit terms;
- source units outside SHACL IN;
- source units incompatible with the requested target;
- absent Eyeling conversion results; and
- malformed CDT literals or UCUM codes that do not map to an allowed QUDT unit.

A globally incompatible SHACL OUT throws `IncompatibleDimensionError` before stream processing begins.

Dimension equality prevents nonsensical conversions such as metre to second, but dimensional equality alone is not always sufficient to establish semantic substitutability. For example, dimensionally equivalent quantity kinds may still represent distinct concepts. A production profile should decide whether to add quantity-kind constraints for its domain.

## Repository layout

```text
background/     curated QUDT graph and generated combined N3 background
rules/          generic backward N3 conversion rule
src/            planner, compiler, stream engine, RDF helpers
examples/       runnable SHACL/RDF Message example
tests/          planning tests, 73-message conversion corpus, and CDT literal fixtures
scripts/        build, playground, and hook utilities
playground/     zero-dependency browser playground source
```

## Development hooks and CI

`npm install` configures `.githooks/` as the repository hook path. The pre-commit hook runs
`npm run build` and stages `dist/`, ensuring every commit carries the generated build that
GitHub Pages publishes. Run `npm run setup:hooks` to configure the hook without reinstalling.

The `Tests` GitHub Actions workflow installs with `npm ci` on Node.js 24 and runs `npm test`
for pushes to `main`, pull requests, and manual dispatches.

## License and data note

The project source is MIT-licensed. `background/qudt-mini.ttl` is a hand-curated interoperability fixture derived from publicly documented QUDT unit semantics and is not a replacement for, or redistribution of, the complete QUDT vocabularies. Review QUDT's own terms when distributing official QUDT data with an application.
