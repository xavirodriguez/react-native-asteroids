import { System } from "../core/System";
import { World } from "../core/World";

/**
 * Decorador encargado de medir el tiempo de ejecución de un sistema ECS.
 *
 * @remarks
 * Implementa una **Media Móvil (Moving Average)** basada en los últimos 60 frames
 * para suavizar los picos de CPU y ofrecer una métrica de rendimiento estable.
 */
export class SystemProfiler extends System {
  private systemTimings: Map<string, number[]> = new Map();
  private readonly MAX_SAMPLES = 60;

  constructor(private readonly targetSystem: System) {
    super();
  }

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

  public getAverageTime(): number {
    const systemName = this.targetSystem.constructor.name;
    const timings = this.systemTimings.get(systemName);
    if (!timings || timings.length === 0) return 0;
    return timings.reduce((a, b) => a + b, 0) / timings.length;
  }
}
