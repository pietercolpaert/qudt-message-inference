import type { Quad } from '@rdfjs/types';
import type { InputShapePlan, PlannerSummary, QudtUnitDefinition } from './types';
export declare class QudtUnitIndex {
    private readonly unitsByIri;
    constructor(backgroundKnowledge: readonly Quad[]);
    get size(): number;
    get(unitIri: string): QudtUnitDefinition | undefined;
    require(unitIri: string): QudtUnitDefinition;
    all(): readonly QudtUnitDefinition[];
    unitsInDimensions(dimensions: ReadonlySet<string>): readonly QudtUnitDefinition[];
    plan(input: InputShapePlan): {
        readonly retainedUnits: readonly QudtUnitDefinition[];
        readonly sourceUnits: readonly QudtUnitDefinition[];
        readonly sourceDimensions: ReadonlySet<string>;
        readonly summary: PlannerSummary;
    };
    serializeEffectiveFacts(units: readonly QudtUnitDefinition[]): string;
}
//# sourceMappingURL=qudt-index.d.ts.map