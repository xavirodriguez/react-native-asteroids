/**
 * @packageDocumentation
 * Performance profiling for ECS systems.
 * Wraps systems to measure and track execution time across multiple frames.
 */

import { System } from "../core/System";
import { World } from "../core/World";

/**
 * Decorator or wrapper for systems to track their execution time.
 *
 * @remarks
 * This system implements the 'Proxy' pattern, intercepting the `update` call of a target system
 * to measure its duration using `performance.now()`. It maintains a rolling window of samples
 * to provide averaged timing data.
 *
 * @responsibility Wrap a target {@link System} and measure its execution cost per frame.
 * @responsibility Provide averaged performance metrics for debugging and optimization.
 *
 * @example
 * ```ts
 * const physics = new PhysicsSystem();
 * const profiledPhysics = new SystemProfiler(physics);
 * world.addSystem(profiledPhysics);
 *
 * // Later, check performance:
 * console.log(`Physics avg: ${profiledPhysics.getAverageTime()}ms`);
 * ```
 */
export class SystemProfiler extends System {
  /** Internal storage for execution time samples per system name. */
  private systemTimings: Map<string, number[]> = new Map();
  /** Maximum number of samples to keep for the rolling average. */
  private readonly MAX_SAMPLES = 60;

  /**
   * Creates a new profiler for the specified system.
   * @param targetSystem - The system instance to be monitored.
   */
  constructor(private readonly targetSystem: System) {
    super();
  }

  /**
   * Updates the target system and records its execution time.
   *
   * @param world - The ECS world.
   * @param deltaTime - Elapsed time in milliseconds.
   *
   * @remarks
   * The profiler uses `performance.now()` for high-resolution timing.
   * Note that the overhead of the profiler itself is not subtracted from the measurement.
   */
  update(world: World, deltaTime: number): void {
    const start = performance.now();
    this.targetSystem.update(world, deltaTime);
    const end = performance.now();
    const duration = end - start;

    const systemName = this.targetSystem.constructor.name;
    let timings = this.systemTimings.get(systemName);
    if (!timings) {
      timings = [];
      this.systemTimings.set(systemName, timings);
    }

    timings.push(duration);
    if (timings.length > this.MAX_SAMPLES) {
      timings.shift();
    }
  }

  /**
   * Calculates the average execution time of the target system over the last captured samples.
   *
   * @returns Average time in milliseconds. Returns 0 if no samples have been captured yet.
   * @queries systemTimings
   */
  public getAverageTime(): number {
    const systemName = this.targetSystem.constructor.name;
    const timings = this.systemTimings.get(systemName);
    if (!timings || timings.length === 0) return 0;
    return timings.reduce((a, b) => a + b, 0) / timings.length;
  }
}
