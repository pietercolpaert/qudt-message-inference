import type { Quad, Term } from '@rdfjs/types';
export declare function sameTerm(a: Term, b: Term): boolean;
export declare function termKey(term: Term): string;
export declare function objects(quads: readonly Quad[], subject: Term, predicateIri: string): Term[];
export declare function firstObject(quads: readonly Quad[], subject: Term, predicateIri: string): Term | undefined;
export declare function subjects(quads: readonly Quad[], predicateIri: string, object?: Term): Term[];
export declare function readRdfList(quads: readonly Quad[], head: Term): Term[];
export declare function uniqueTerms(terms: readonly Term[]): Term[];
//# sourceMappingURL=graph.d.ts.map