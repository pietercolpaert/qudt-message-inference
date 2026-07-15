import type { InputShapePlan, OutputShapePlan, QudtUnitDefinition } from './types';
import { QudtUnitIndex } from './qudt-index';
export declare function loadDefaultBackwardRule(): string;
export declare function compileEyelingProgram(options: {
    readonly backwardRule: string;
    readonly index: QudtUnitIndex;
    readonly units: readonly QudtUnitDefinition[];
    readonly input: InputShapePlan;
    readonly output: OutputShapePlan;
}): string;
//# sourceMappingURL=n3-compiler.d.ts.map