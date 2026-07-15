import { join, resolve } from 'node:path';
import {
  collectMessages,
  inferredMessagesToLog,
  loadQuads,
  loadRdfMessageLog,
  QudtMessageInferenceEngine,
} from '../../src';

async function main(): Promise<void> {
  const root = resolve(__dirname, '../../..');
  const example = join(root, 'examples', 'normalize-length');
  const engine = new QudtMessageInferenceEngine({
    shaclIn: loadQuads(join(example, 'input-shape.ttl')),
    backgroundKnowledge: loadQuads(join(root, 'background', 'qudt-mini.ttl')),
  });
  const messages = loadRdfMessageLog(join(example, 'messages.trig'));
  const inferred = await collectMessages(
    engine.infer(loadQuads(join(example, 'output-shape.ttl')), messages),
  );

  console.error('Planner:', engine.getPlanSummary());
  console.log(inferredMessagesToLog(inferred));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
