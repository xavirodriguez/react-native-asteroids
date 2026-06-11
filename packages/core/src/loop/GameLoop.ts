import { FrameScheduler, defaultFrameScheduler } from "./FrameScheduler";

export type GameLoopListener = (deltaTime: number) => void;
export type RenderListener = (alpha: number, deltaTime: number) => void;

export interface GameLoopConfig {
  maxDeltaMs?: number;
  /** Maximum number of simulation updates allowed per real frame to help prevent main thread blocking. */
  maxUpdatesPerFrame?: number;
  /** Custom scheduler implementation. Defaults to browser/RN requestAnimationFrame. */
  scheduler?: FrameScheduler;
}

/**
 * Central time manager orchestrating the game's lifecycle.
 *
 * @remarks
 * Designed to implement a semi-fixed timestep loop (Fix Your Timestep!) to help decouple
 * simulation from rendering.
 *
 * ### Lifecycle Phases:
 * 1. **Input**: Variable step, processes raw inputs.
 * 2. **Simulation**: Uses a fixed-step target (60Hz); designed to support reproducible
 *    simulation logic under controlled conditions.
 * 3. **Transform**: Post-simulation updates (e.g., hierarchy resolution).
 * 4. **Render**: Variable-step, providing interpolation alpha for visual smoothing.
 *
 * @warning **Spiral of Death & Reproducibility**: Under extreme load, the loop is designed to
 * clamp or limit simulation steps to help avoid the "Spiral of Death" (endless simulation
 * catch-up). This may result in "slow-motion" gameplay or dropped ticks when the CPU cannot
 * maintain the fixed-step target. Reproducible behavior is generally compromised if ticks
 * are dropped, as the simulation state will no longer align with the expected timeline.
 */
export class GameLoop {
  private isRunning = false;
  private lastTime = 0;
  private accumulator = 0;
  private frameHandle: unknown = null;

  public getAccumulator(): number { return this.accumulator; }
  public setAccumulator(val: number): void { this.accumulator = val; }

  private readonly fixedDeltaTime = 1000 / 60; // 60 FPS simulation
  private readonly maxDeltaMs: number;
  private readonly maxUpdatesPerFrame: number;
  private readonly scheduler: FrameScheduler;

  private inputListeners = new Set<GameLoopListener>();
  private updateListeners = new Set<GameLoopListener>();
  private transformListeners = new Set<GameLoopListener>();
  private renderListeners = new Set<RenderListener>();

  private activeUpdateListeners: GameLoopListener[] = [];
  private needsUpdateRebuild = true;

  constructor(config: GameLoopConfig = {}) {
    this.maxDeltaMs = config.maxDeltaMs ?? 100;
    this.maxUpdatesPerFrame = config.maxUpdatesPerFrame ?? 240;
    this.scheduler = config.scheduler ?? defaultFrameScheduler;
  }

  public subscribeInput(listener: GameLoopListener): () => void {
    this.inputListeners.add(listener);
    return () => this.inputListeners.delete(listener);
  }

  public subscribeUpdate(listener: GameLoopListener): () => void {
    this.updateListeners.add(listener);
    this.needsUpdateRebuild = true;
    return () => {
      this.updateListeners.delete(listener);
      this.needsUpdateRebuild = true;
    };
  }

  public subscribeTransform(listener: GameLoopListener): () => void {
    this.transformListeners.add(listener);
    return () => this.transformListeners.delete(listener);
  }

  public subscribeRender(listener: RenderListener): () => void {
    this.renderListeners.add(listener);
    return () => this.renderListeners.delete(listener);
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = this.scheduler.now();
    this.frameHandle = this.scheduler.requestFrame(this.loop);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.frameHandle !== null) {
      this.scheduler.cancelFrame(this.frameHandle);
      this.frameHandle = null;
    }
  }

  private loop = (currentTime: number): void => {
    if (!this.isRunning) return;

    const deltaTime = Math.min(currentTime - this.lastTime, this.maxDeltaMs);
    this.lastTime = currentTime;
    this.accumulator += deltaTime;

    // 1. Input Phase (Variable Step)
    this.inputListeners.forEach(listener => listener(deltaTime));

    // 2. Simulation Phase (Fixed Step Target)
    let updatesThisFrame = 0;
    while (this.accumulator >= this.fixedDeltaTime) {
      if (updatesThisFrame >= this.maxUpdatesPerFrame) {
        console.warn(`[GameLoop] Spiral of Death detected. Dropping remaining ticks for this frame. (Updates: ${updatesThisFrame})`);
        this.accumulator = 0;
        break;
      }

      if (this.needsUpdateRebuild) {
        this.activeUpdateListeners = Array.from(this.updateListeners);
        this.needsUpdateRebuild = false;
      }

      for (let i = 0; i < this.activeUpdateListeners.length; i++) {
        this.activeUpdateListeners[i](this.fixedDeltaTime);
      }

      this.accumulator -= this.fixedDeltaTime;
      updatesThisFrame++;
    }

    // 3. Transform Phase (after simulation, before render)
    this.transformListeners.forEach(listener => listener(deltaTime));

    // 4. Render Phase (Variable Step with alpha interpolation)
    const alpha = this.accumulator / this.fixedDeltaTime;
    this.renderListeners.forEach(listener => listener(alpha, deltaTime));

    this.frameHandle = this.scheduler.requestFrame(this.loop);
  };
}
