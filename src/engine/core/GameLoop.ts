export interface LoopConfig {
  fixedHz?: number;
  maxDeltaMs?: number;
}

/**
 * Deterministic Game Loop with fixed timestep.
 *
 * @remarks
 * Implements a strict frame pipeline:
 * 1. Input Phase
 * 2. Fixed Update Phase (Simulation): Guarantees deterministic state.
 * 3. Transform Propagation Phase: Resolves hierarchy.
 * 4. Render Phase (Presentation): Pure, variable-rate rendering with alpha interpolation.
 */
export class GameLoop {
  private isRunning: boolean = false;
  private lastTime: number = 0;
  private gameLoopId?: number;
  private accumulator: number = 0;

  private fixedDeltaTime: number = 1000 / 60;
  private maxDeltaTime: number = 100;

  private inputListeners: (() => void)[] = [];
  private updateListeners: ((deltaTime: number) => void)[] = [];
  private transformListeners: (() => void)[] = [];
  private renderListeners: ((alpha: number, deltaTime: number) => void)[] = [];

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

  public subscribeInput(listener: () => void): () => void {
    this.inputListeners.push(listener);
    return () => {
        this.inputListeners = this.inputListeners.filter(l => l !== listener);
    };
  }

  public subscribeUpdate(listener: (deltaTime: number) => void): () => void {
    this.updateListeners.push(listener);
    return () => {
        this.updateListeners = this.updateListeners.filter(l => l !== listener);
    };
  }

  public subscribeTransform(listener: () => void): () => void {
    this.transformListeners.push(listener);
    return () => {
        this.transformListeners = this.transformListeners.filter(l => l !== listener);
    };
  }

  public subscribeRender(listener: (alpha: number, deltaTime: number) => void): () => void {
    this.renderListeners.push(listener);
    return () => {
        this.renderListeners = this.renderListeners.filter(l => l !== listener);
    };
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

    // 1. Input Phase
    for (let i = 0; i < this.inputListeners.length; i++) {
        this.inputListeners[i]();
    }

    // 2. Fixed Step Update Phase (Simulation)
    while (this.accumulator >= this.fixedDeltaTime) {
      for (let i = 0; i < this.updateListeners.length; i++) {
          this.updateListeners[i](this.fixedDeltaTime);
      }
      this.accumulator -= this.fixedDeltaTime;
    }

    // 3. Transform Propagation Phase
    for (let i = 0; i < this.transformListeners.length; i++) {
        this.transformListeners[i]();
    }

    // 4. Variable Step Render Phase (Presentation)
    const alpha = this.accumulator / this.fixedDeltaTime;
    for (let i = 0; i < this.renderListeners.length; i++) {
        this.renderListeners[i](alpha, deltaTime);
    }

    if (this.isRunning) {
      this.gameLoopId = requestAnimationFrame(this.loop);
    }
  };
}
