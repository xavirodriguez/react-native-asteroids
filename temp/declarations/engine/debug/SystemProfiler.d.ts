import { System } from "../core/System";
import { World } from "../core/World";
/**
 * Decorator or wrapper for systems to track their execution time.
 */
export declare class SystemProfiler extends System {
    private readonly targetSystem;
    private systemTimings;
    private readonly MAX_SAMPLES;
    constructor(targetSystem: System);
    update(world: World, deltaTime: number): void;
    getAverageTime(): number;
}
