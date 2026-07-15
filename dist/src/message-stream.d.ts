import type { Quad } from '@rdfjs/types';
import type { InferredRdfMessage, RdfMessage } from './types';
export declare function messageStreamFromLog(source: string): AsyncGenerator<RdfMessage>;
export declare function messagesFromArrays(messages: readonly (readonly Quad[])[]): AsyncGenerator<RdfMessage>;
export declare function collectMessages<T>(messages: AsyncIterable<T>): Promise<T[]>;
export declare function inferredMessagesToLog(messages: readonly InferredRdfMessage[]): string;
//# sourceMappingURL=message-stream.d.ts.map