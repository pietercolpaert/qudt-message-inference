import type { Quad, Term } from '@rdfjs/types';
import { firstObject, objects, readRdfList, subjects, termKey } from './graph';
import type { InputShapePlan, OutputShapePlan } from './types';
import { CDT, NUMERIC_DATATYPES, QUDT, RDF, SH } from './vocab';

interface QuantityShapeSkeleton {
  readonly targetClasses: readonly string[];
  readonly quantityPath: string;
  readonly numericValuePath: string;
  readonly unitPath: string;
  readonly unitTerms: readonly Term[];
}

function requireNamedNode(term: Term | undefined, context: string): string {
  if (!term || term.termType !== 'NamedNode') {
    throw new Error(`${context} must be a simple IRI path or IRI value.`);
  }
  return term.value;
}

function isNumericPropertyShape(quads: readonly Quad[], propertyShape: Term): boolean {
  const path = firstObject(quads, propertyShape, SH.path);
  if (path?.termType === 'NamedNode' && path.value === QUDT.numericValue) return true;
  const datatype = firstObject(quads, propertyShape, SH.datatype);
  if (datatype?.termType === 'NamedNode' && NUMERIC_DATATYPES.has(datatype.value)) return true;
  return objects(quads, propertyShape, SH.unit).length > 0;
}

function isUnitPropertyShape(quads: readonly Quad[], propertyShape: Term): boolean {
  const path = firstObject(quads, propertyShape, SH.path);
  if (path?.termType === 'NamedNode' && path.value === QUDT.unit) return true;
  return (
    objects(quads, propertyShape, SH.in).length > 0 ||
    objects(quads, propertyShape, SH.hasValue).some((term) => term.termType === 'NamedNode')
  );
}

function collectUnitTerms(
  quads: readonly Quad[],
  numericShape: Term,
  unitShape: Term,
): Term[] {
  const unitMap = new Map<string, Term>();
  for (const term of objects(quads, numericShape, SH.unit)) {
    unitMap.set(termKey(term), term);
  }
  for (const term of objects(quads, unitShape, SH.hasValue)) {
    unitMap.set(termKey(term), term);
  }
  for (const listHead of objects(quads, unitShape, SH.in)) {
    for (const term of readRdfList(quads, listHead)) unitMap.set(termKey(term), term);
  }
  return [...unitMap.values()];
}

function findNodeShapes(shapes: readonly Quad[]): Term[] {
  return subjects(
    shapes,
    RDF.type,
    // rdf:type comparisons use term identity, so locate by value below.
  ).filter((subject) =>
    shapes.some(
      (quad) =>
        quad.subject.termType === subject.termType &&
        quad.subject.value === subject.value &&
        quad.predicate.value === RDF.type &&
        quad.object.termType === 'NamedNode' &&
        quad.object.value === SH.NodeShape,
    ),
  );
}

function compileSkeleton(shapes: readonly Quad[]): QuantityShapeSkeleton {
  const nodeShapes = findNodeShapes(shapes);

  const candidates: QuantityShapeSkeleton[] = [];

  for (const rootShape of nodeShapes) {
    const targetClasses = objects(shapes, rootShape, SH.targetClass)
      .filter((term): term is Extract<Term, { termType: 'NamedNode' }> => term.termType === 'NamedNode')
      .map((term) => term.value);

    for (const rootPropertyShape of objects(shapes, rootShape, SH.property)) {
      const nestedShape = firstObject(shapes, rootPropertyShape, SH.node);
      if (!nestedShape) continue;

      const quantityPath = requireNamedNode(
        firstObject(shapes, rootPropertyShape, SH.path),
        'The root quantity sh:path',
      );

      const nestedPropertyShapes = objects(shapes, nestedShape, SH.property);
      const numericCandidates = nestedPropertyShapes.filter((term) =>
        isNumericPropertyShape(shapes, term),
      );
      const unitCandidates = nestedPropertyShapes.filter((term) =>
        isUnitPropertyShape(shapes, term),
      );

      if (numericCandidates.length !== 1 || unitCandidates.length !== 1) continue;
      const numericShape = numericCandidates[0];
      const unitShape = unitCandidates[0];

      candidates.push({
        targetClasses,
        quantityPath,
        numericValuePath: requireNamedNode(
          firstObject(shapes, numericShape, SH.path),
          'The numeric value sh:path',
        ),
        unitPath: requireNamedNode(
          firstObject(shapes, unitShape, SH.path),
          'The unit sh:path',
        ),
        unitTerms: collectUnitTerms(shapes, numericShape, unitShape),
      });
    }
  }

  if (candidates.length === 0) {
    throw new Error(
      'No supported nested quantity shape was found. Expected a root sh:property/sh:node structure with one numeric property and one unit property.',
    );
  }
  if (candidates.length > 1) {
    throw new Error(
      `Found ${candidates.length} supported quantity mappings. Version 0.1 accepts exactly one mapping per SHACL graph.`,
    );
  }
  return candidates[0];
}

export function compileInputShape(shapes: readonly Quad[]): InputShapePlan {
  const literalCandidates: InputShapePlan[] = [];
  for (const rootShape of findNodeShapes(shapes)) {
    const targetClasses = objects(shapes, rootShape, SH.targetClass)
      .filter((term): term is Extract<Term, { termType: 'NamedNode' }> => term.termType === 'NamedNode')
      .map((term) => term.value);
    for (const propertyShape of objects(shapes, rootShape, SH.property)) {
      if (firstObject(shapes, propertyShape, SH.node)) continue;
      const literalDatatypes = objects(shapes, propertyShape, SH.datatype)
        .filter((term): term is Extract<Term, { termType: 'NamedNode' }> =>
          term.termType === 'NamedNode' && CDT.supported.has(term.value),
        )
        .map((term) => term.value);
      if (literalDatatypes.length === 0) continue;
      const unitTerms = objects(shapes, propertyShape, SH.unit);
      const allowedUnits = new Set<string>();
      for (const term of unitTerms) {
        if (term.termType !== 'NamedNode') {
          throw new Error('CDT literal input sh:unit values must be QUDT unit IRIs.');
        }
        allowedUnits.add(term.value);
      }
      if (allowedUnits.size === 0) {
        throw new Error(
          'A CDT literal input shape must enumerate its possible QUDT source units with sh:unit.',
        );
      }
      literalCandidates.push({
        representation: 'cdt-literal',
        targetClasses,
        quantityPath: requireNamedNode(
          firstObject(shapes, propertyShape, SH.path),
          'The CDT literal sh:path',
        ),
        allowedUnits,
        literalDatatypes: new Set(literalDatatypes),
      });
    }
  }
  if (literalCandidates.length > 1) {
    throw new Error(
      `Found ${literalCandidates.length} supported CDT literal mappings. Version 0.1 accepts exactly one mapping per SHACL graph.`,
    );
  }
  if (literalCandidates.length === 1) return literalCandidates[0];

  const skeleton = compileSkeleton(shapes);
  const allowedUnits = new Set<string>();
  for (const term of skeleton.unitTerms) {
    if (term.termType !== 'NamedNode') {
      throw new Error(
        'This execution profile currently requires QUDT unit IRIs in sh:unit, sh:hasValue, or sh:in.',
      );
    }
    allowedUnits.add(term.value);
  }
  if (allowedUnits.size === 0) {
    throw new Error(
      'SHACL IN must enumerate possible source units with sh:in, sh:hasValue, or sh:unit so that the background can be pruned safely.',
    );
  }
  return {
    representation: 'qudt-quantity',
    targetClasses: skeleton.targetClasses,
    quantityPath: skeleton.quantityPath,
    numericValuePath: skeleton.numericValuePath,
    unitPath: skeleton.unitPath,
    allowedUnits,
    literalDatatypes: new Set(),
  };
}

export function compileOutputShape(shapes: readonly Quad[]): OutputShapePlan {
  const skeleton = compileSkeleton(shapes);
  const targetUnits = skeleton.unitTerms.filter(
    (term): term is Extract<Term, { termType: 'NamedNode' }> => term.termType === 'NamedNode',
  );
  if (targetUnits.length !== 1) {
    throw new Error(
      `SHACL OUT must identify exactly one target QUDT unit IRI; found ${targetUnits.length}.`,
    );
  }
  return {
    targetClasses: skeleton.targetClasses,
    quantityPath: skeleton.quantityPath,
    numericValuePath: skeleton.numericValuePath,
    unitPath: skeleton.unitPath,
    targetUnit: targetUnits[0].value,
  };
}
