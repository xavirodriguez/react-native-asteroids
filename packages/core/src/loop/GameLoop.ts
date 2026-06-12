import { FrameScheduler, browserFrameScheduler } from "./FrameScheduler";

export type UpdateListener<T> = (deltaTime: number, state: T) => void;
export type RenderListener = (interpolation: number) => void;

/**
 * Configuration for the GameLoop.
 */
export interface GameLoopConfig {
  /**
   * Maximum time delta allowed in a single frame to prevent "spiral of death" in heavy load.
   * Defaults to 250ms.
   */
  maxDeltaMs?: number;
  /**
   * Maximum number of fixed-timestep updates allowed per frame.
   * Defaults to 10.
   */
  maxUpdatesPerFrame?: number;
  /**
   * The scheduler used to request animation frames.
   */
  scheduler?: FrameScheduler;
  /**
   * Target simulation FPS.
   */
  fps?: number;
}

/**
 * Orchestrates the simulation and rendering timing.
 *
 * @remarks
 * The GameLoop uses a fixed-timestep approach for simulation updates to help achieve
 * reproducible behavior, while using a variable timestep for rendering with interpolation.
 */
export class GameLoop {
  private scheduler: FrameScheduler;
  private maxDeltaMs: number;
  private maxUpdatesPerFrame: number;
  private msPerUpdate: number;

  private isRunning = false;
  private lastTime = 0;
  private accumulator = 0;
  private frameHandle: unknown = null;

  private updateListeners: Set<UpdateListener<any>> = new Set();
  private renderListeners: Set<RenderListener> = new Set();

  constructor(config: GameLoopConfig = {}) {
    this.scheduler = config.scheduler ?? browserFrameScheduler;
    this.maxDeltaMs = config.maxDeltaMs ?? 250;
    this.maxUpdatesPerFrame = config.maxUpdatesPerFrame ?? 10;
    const fps = config.fps ?? 60;
    this.msPerUpdate = 1000 / fps;
  }

  /**
   * Starts the game loop.
   */
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = this.scheduler.now();
    this.accumulator = 0;
    this.frameHandle = this.scheduler.requestFrame(this.loop);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.frameHandle !== null) {
      this.scheduler.cancelFrame(this.frameHandle);
      this.frameHandle = null;
    }
  }

  /**
   * Subscribes a listener to simulation updates.
   *
   * @remarks
   * Simulation updates use a fixed timestep.
   */
  public subscribeUpdate<T>(listener: UpdateListener<T>): () => void {
    this.updateListeners.add(listener);
    return () => this.updateListeners.delete(listener);
  }

  /**
   * Subscribes a listener to render updates.
   *
   * @remarks
   * Render updates are called once per frame with an interpolation factor.
   */
  public subscribeRender(listener: RenderListener): () => void {
    this.renderListeners.add(listener);
    return () => this.renderListeners.delete(listener);
  }

  /**
   * Main loop execution.
   *
   * @remarks
   * Implements a fixed-timestep simulation with a variable-rate renderer.
   * Under heavy load, simulation updates are clamped by `maxUpdatesPerFrame`
   * and `maxDeltaMs` to help prevent the "spiral of death".
   */
  private loop = (time: number): void => {
    if (!this.isRunning) return;

    let deltaTime = time - this.lastTime;
    // Clamp delta time to avoid large jumps (e.g., after a tab backgrounding)
    if (deltaTime > this.maxDeltaMs) {
      deltaTime = this.maxDeltaMs;
    }

    this.lastTime = time;
    this.accumulator += deltaTime;

    let updates = 0;
    // Run fixed-timestep updates
    while (this.accumulator >= this.msPerUpdate && updates < this.maxUpdatesPerFrame) {
      this.update(this.msPerUpdate / 1000);
      this.accumulator -= this.msPerUpdate;
      updates++;
    }

    // Render with interpolation factor for smooth movement between simulation steps
    const interpolation = this.accumulator / this.msPerUpdate;
    this.render(interpolation);

    this.frameHandle = this.scheduler.requestFrame(this.loop);
  };

  private update(dt: number): void {
    for (const listener of this.updateListeners) {
      listener(dt, null);
    }
  }

  private render(interpolation: number): void {
    for (const listener of this.renderListeners) {
      listener(interpolation);
    }
  }
}
