import type { Quad, Term } from '@rdfjs/types';
import { RDF } from './vocab';

export function sameTerm(a: Term, b: Term): boolean {
  if (a.termType !== b.termType || a.value !== b.value) return false;
  if (a.termType === 'Literal' && b.termType === 'Literal') {
    return a.language === b.language && a.datatype.value === b.datatype.value;
  }
  return true;
}

export function termKey(term: Term): string {
  if (term.termType === 'Literal') {
    return `L|${term.value}|${term.language}|${term.datatype.value}`;
  }
  return `${term.termType}|${term.value}`;
}

export function objects(
  quads: readonly Quad[],
  subject: Term,
  predicateIri: string,
): Term[] {
  return quads
    .filter((quad) => sameTerm(quad.subject, subject) && quad.predicate.value === predicateIri)
    .map((quad) => quad.object);
}

export function firstObject(
  quads: readonly Quad[],
  subject: Term,
  predicateIri: string,
): Term | undefined {
  return quads.find(
    (quad) => sameTerm(quad.subject, subject) && quad.predicate.value === predicateIri,
  )?.object;
}

export function subjects(
  quads: readonly Quad[],
  predicateIri: string,
  object?: Term,
): Term[] {
  const result = new Map<string, Term>();
  for (const quad of quads) {
    if (quad.predicate.value !== predicateIri) continue;
    if (object && !sameTerm(quad.object, object)) continue;
    result.set(termKey(quad.subject), quad.subject);
  }
  return [...result.values()];
}

export function readRdfList(quads: readonly Quad[], head: Term): Term[] {
  if (head.termType === 'NamedNode' && head.value === RDF.nil) return [];
  const values: Term[] = [];
  const visited = new Set<string>();
  let cursor: Term | undefined = head;

  while (cursor) {
    const key = termKey(cursor);
    if (visited.has(key)) {
      throw new Error('Cycle detected in RDF list.');
    }
    visited.add(key);

    if (cursor.termType === 'NamedNode' && cursor.value === RDF.nil) break;
    const first = firstObject(quads, cursor, RDF.first);
    const rest = firstObject(quads, cursor, RDF.rest);
    if (!first || !rest) {
      throw new Error(`Malformed RDF list at ${cursor.value || cursor.termType}.`);
    }
    values.push(first);
    cursor = rest;
  }

  return values;
}

export function uniqueTerms(terms: readonly Term[]): Term[] {
  const map = new Map<string, Term>();
  for (const term of terms) map.set(termKey(term), term);
  return [...map.values()];
}
