import { readFileSync } from 'node:fs';
import type { Quad, Term } from '@rdfjs/types';
import { DataFactory, isMessageQuad, Parser } from 'rdf-parser-ts';

interface MessageQuadLike {
  readonly quad: Quad;
  readonly messageCounter?: number;
  readonly message?: number;
}

interface ParsedMessageArray extends Array<unknown> {
  readonly messageCount?: number;
}

export { DataFactory };

export function parseQuads(source: string): Quad[] {
  const parser = new Parser({ factory: DataFactory });
  const parsed = (parser.parse(source) ?? []) as Iterable<unknown>;
  const quads: Quad[] = [];
  for (const item of parsed) {
    quads.push((isMessageQuad(item) ? (item as MessageQuadLike).quad : item) as Quad);
  }
  return quads;
}

export function parseRdfMessageLog(source: string): Quad[][] {
  const parser = new Parser({ factory: DataFactory });
  const parsed = (parser.parse(source) ?? []) as ParsedMessageArray;
  const grouped = new Map<number, Quad[]>();
  let sawMessageMetadata = false;
  let maximumCounter = -1;

  for (const item of parsed) {
    if (isMessageQuad(item)) {
      sawMessageMetadata = true;
      const messageItem = item as MessageQuadLike;
      const counter = messageItem.messageCounter ?? messageItem.message ?? 0;
      maximumCounter = Math.max(maximumCounter, counter);
      const message = grouped.get(counter) ?? [];
      message.push(messageItem.quad);
      grouped.set(counter, message);
    } else {
      const message = grouped.get(0) ?? [];
      message.push(item as Quad);
      grouped.set(0, message);
      maximumCounter = Math.max(maximumCounter, 0);
    }
  }

  if (!sawMessageMetadata) return grouped.size === 0 ? [] : [grouped.get(0) ?? []];

  const declaredCount = parsed.messageCount;
  const count = declaredCount ?? maximumCounter + 1;
  const messages: Quad[][] = [];
  for (let index = 0; index < count; index += 1) {
    messages.push(grouped.get(index) ?? []);
  }
  return messages;
}

export function loadQuads(path: string): Quad[] {
  return parseQuads(readFileSync(path, 'utf8'));
}

export function loadRdfMessageLog(path: string): Quad[][] {
  return parseRdfMessageLog(readFileSync(path, 'utf8'));
}

export function iri(value: string): string {
  return `<${value.replace(/>/g, '%3E')}>`;
}

export function escapeLiteral(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

export function termToN3(term: Term): string {
  switch (term.termType) {
    case 'NamedNode':
      return iri(term.value);
    case 'BlankNode':
      return `_:${term.value}`;
    case 'Literal': {
      const lexical = `"${escapeLiteral(term.value)}"`;
      if (term.language) return `${lexical}@${term.language}`;
      return `${lexical}^^${iri(term.datatype.value)}`;
    }
    case 'Variable':
      return `?${term.value}`;
    case 'DefaultGraph':
      return '';
    default:
      throw new Error(`Unsupported RDF term type for N3 serialization: ${term.termType}`);
  }
}

export function quadToN3(quad: Quad): string {
  if (quad.graph.termType !== 'DefaultGraph') {
    throw new Error('Named-graph serialization is not supported by the compact helper.');
  }
  return `${termToN3(quad.subject)} ${termToN3(quad.predicate)} ${termToN3(quad.object)} .`;
}

export function writeMessageLog(messages: readonly (readonly Quad[])[]): string {
  const lines = ['@version "1.2-messages" .', ''];
  messages.forEach((message, index) => {
    for (const quad of message) lines.push(quadToN3(quad));
    if (index < messages.length - 1) lines.push('', '@message .', '');
  });
  return `${lines.join('\n')}\n`;
}
