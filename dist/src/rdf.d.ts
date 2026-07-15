import type { Quad, Term } from '@rdfjs/types';
import { DataFactory } from 'rdf-parser-ts';
export { DataFactory };
export declare function parseQuads(source: string): Quad[];
export declare function parseRdfMessageLog(source: string): Quad[][];
export declare function loadQuads(path: string): Quad[];
export declare function loadRdfMessageLog(path: string): Quad[][];
export declare function iri(value: string): string;
export declare function escapeLiteral(value: string): string;
export declare function termToN3(term: Term): string;
export declare function quadToN3(quad: Quad): string;
export declare function writeMessageLog(messages: readonly (readonly Quad[])[]): string;
//# sourceMappingURL=rdf.d.ts.map