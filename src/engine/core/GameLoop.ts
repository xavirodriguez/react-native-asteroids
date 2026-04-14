export interface LoopConfig {
  fixedHz?: number;
  maxDeltaMs?: number;
}

/**
 * Deterministic Game Loop with fixed timestep.
 *
 * @remarks
 * Implements "Fix Your Timestep" with an accumulator to ensure simulation
 * consistency regardless of frame rate.
 *
 * Pipeline:
 * 1. Simulation Phase (Fixed Update): 60Hz default.
 * 2. Presentation Phase (Variable Render): Alpha interpolation.
 */
export class GameLoop {
  private isRunning: boolean = false;
  private lastTime: number = 0;
  private gameLoopId?: number;
  private accumulator: number = 0;

  private fixedDeltaTime: number = 1000 / 60;
  private maxDeltaTime: number = 100;

  private updateListeners: Set<(deltaTime: number) => void> = new Set();
  private renderListeners: Set<(alpha: number, deltaTime: number) => void> = new Set();

  constructor(config: LoopConfig = {}) {
    const { fixedHz = 60, maxDeltaMs = 100 } = config;
    this.fixedDeltaTime = 1000 / fixedHz;
    this.maxDeltaTime = maxDeltaMs;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.gameLoopId = requestAnimationFrame(this.loop);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.gameLoopId !== undefined) {
      cancelAnimationFrame(this.gameLoopId);
      this.gameLoopId = undefined;
    }
  }

  public subscribeUpdate(listener: (deltaTime: number) => void): () => void {
    this.updateListeners.add(listener);
    return () => this.updateListeners.delete(listener);
  }

  public subscribeRender(listener: (alpha: number, deltaTime: number) => void): () => void {
    this.renderListeners.add(listener);
    return () => this.renderListeners.delete(listener);
  }

  private loop = (currentTime: number): void => {
    if (!this.isRunning) return;

    let deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Prevent Spiral of Death
    if (deltaTime > this.maxDeltaTime) {
      deltaTime = this.maxDeltaTime;
    }

    this.accumulator += deltaTime;

    // 1. Fixed Step Update Phase (Simulation)
    // Guarantees deterministic state progression.
    while (this.accumulator >= this.fixedDeltaTime) {
      this.updateListeners.forEach((listener) => listener(this.fixedDeltaTime));
      this.accumulator -= this.fixedDeltaTime;
    }

    // 2. Variable Step Render Phase (Presentation)
    // Uses alpha for smooth visual interpolation between states.
    const alpha = this.accumulator / this.fixedDeltaTime;
    this.renderListeners.forEach((listener) => listener(alpha, deltaTime));

    if (this.isRunning) {
      this.gameLoopId = requestAnimationFrame(this.loop);
    }
  };
}
