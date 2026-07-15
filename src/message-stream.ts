import type { Quad } from '@rdfjs/types';
import { parseRdfMessageLog, writeMessageLog } from './rdf';
import type { InferredRdfMessage, RdfMessage } from './types';

export async function* messageStreamFromLog(source: string): AsyncGenerator<RdfMessage> {
  for (const message of parseRdfMessageLog(source)) yield message;
}

export async function* messagesFromArrays(
  messages: readonly (readonly Quad[])[],
): AsyncGenerator<RdfMessage> {
  for (const message of messages) yield message;
}

export async function collectMessages<T>(messages: AsyncIterable<T>): Promise<T[]> {
  const collected: T[] = [];
  for await (const message of messages) collected.push(message);
  return collected;
}

export function inferredMessagesToLog(messages: readonly InferredRdfMessage[]): string {
  return writeMessageLog(messages.map((message) => message.quads));
}
