import type { Quad, Term } from '@rdfjs/types';
export type RdfMessage = readonly Quad[];
export interface InputShapePlan {
    readonly targetClasses: readonly string[];
    readonly quantityPath: string;
    readonly numericValuePath: string;
    readonly unitPath: string;
    readonly allowedUnits: ReadonlySet<string>;
}
export interface OutputShapePlan {
    readonly targetClasses: readonly string[];
    readonly quantityPath: string;
    readonly numericValuePath: string;
    readonly unitPath: string;
    readonly targetUnit: string;
}
export interface QudtUnitDefinition {
    readonly iri: string;
    readonly dimensionVector: string;
    readonly multiplier: number;
    readonly offset: number;
    readonly symbol?: string;
}
export interface PlannerSummary {
    readonly totalQudtUnits: number;
    readonly retainedQudtUnits: number;
    readonly sourceUnits: readonly string[];
    readonly retainedDimensions: readonly string[];
    readonly quantityPath: string;
    readonly numericValuePath: string;
    readonly unitPath: string;
}
export type DiagnosticCode = 'INCOMPATIBLE_DIMENSION' | 'MISSING_NUMERIC_VALUE' | 'MISSING_UNIT' | 'SOURCE_UNIT_NOT_ALLOWED' | 'UNKNOWN_SOURCE_UNIT' | 'NO_CONVERSION_RESULT';
export interface ConversionDiagnostic {
    readonly code: DiagnosticCode;
    readonly message: string;
    readonly sourceNode?: Term;
    readonly sourceUnit?: string;
    readonly targetUnit?: string;
}
export interface ConversionRecord {
    readonly root: Term;
    readonly sourceQuantity: Term;
    readonly outputQuantity: Term;
    readonly sourceUnit: string;
    readonly targetUnit: string;
    readonly sourceValue: number;
    readonly targetValue: number;
}
export interface InferredRdfMessage {
    readonly messageIndex: number;
    readonly quads: readonly Quad[];
    readonly conversions: readonly ConversionRecord[];
    readonly diagnostics: readonly ConversionDiagnostic[];
}
export interface EngineOptions {
    readonly shaclIn: readonly Quad[];
    readonly backgroundKnowledge: readonly Quad[];
    readonly backwardRule?: string;
    readonly includeInputByDefault?: boolean;
}
export interface InferOptions {
    readonly includeInput?: boolean;
    readonly emitProvenance?: boolean;
}
//# sourceMappingURL=types.d.ts.map