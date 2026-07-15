import type { Quad } from '@rdfjs/types';
import type { EngineOptions, InferOptions, InferredRdfMessage, OutputShapePlan, PlannerSummary, QudtUnitDefinition, RdfMessage } from './types';
export declare class IncompatibleDimensionError extends Error {
    readonly targetUnit: string;
    readonly targetDimension: string;
    readonly sourceDimensions: readonly string[];
    constructor(targetUnit: string, targetDimension: string, sourceDimensions: readonly string[]);
}
export declare class QudtMessageInferenceEngine {
    private readonly inputPlan;
    private readonly index;
    private readonly sourceUnits;
    private readonly sourceDimensions;
    private readonly backwardRule;
    private readonly includeInputByDefault;
    private readonly summary;
    constructor(options: EngineOptions);
    getPlanSummary(): PlannerSummary;
    compile(shaclOut: readonly Quad[]): {
        readonly outputPlan: OutputShapePlan;
        readonly program: string;
        readonly compatibleSourceUnits: readonly QudtUnitDefinition[];
    };
    infer(shaclOut: readonly Quad[], messages: AsyncIterable<RdfMessage> | Iterable<RdfMessage>, options?: InferOptions): AsyncGenerator<InferredRdfMessage>;
}
//# sourceMappingURL=engine.d.ts.map