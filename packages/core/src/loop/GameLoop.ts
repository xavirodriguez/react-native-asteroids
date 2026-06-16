import { FrameScheduler, browserFrameScheduler } from "./FrameScheduler";

export type RenderCallback = (alpha: number) => void;
export type UpdateCallback = (dt: number) => void;

/**
 * Configuration options for the GameLoop.
 */
export interface GameLoopConfig {
  /**
   * The fixed timestep in seconds. Defaults to 1/60.
   */
  step?: number;
  /**
   * The maximum allowed delta time per frame in seconds to prevent "spiral of death".
   */
  maxDelta?: number;
  /**
   * The scheduler used for timing and frame requests.
   */
  scheduler?: FrameScheduler;
}

/**
 * A platform-agnostic game loop implementation using a fixed-timestep accumulator.
 *
 * @remarks
 * This loop is designed to provide a consistent internal simulation frequency
 * (fixed timestep) independent of the rendering framerate.
 *
 * @warning
 * Under heavy load, if the simulation takes longer than the available frame time,
 * the loop may clamp `deltaTime` or limit `maxUpdatesPerFrame`. In such cases,
 * the simulation will appear to slow down (the "spiral of death" mitigation),
 * and absolute temporal consistency with real-time is lost.
 */
export class GameLoop {
  private renderSubscribers: Set<RenderCallback> = new Set();
  private updateSubscribers: Set<UpdateCallback> = new Set();
  private lastTime = 0;
  private accumulator = 0;
  private readonly step: number;
  private readonly maxDelta: number;
  private readonly scheduler: FrameScheduler;
  private isRunning = false;
  private frameHandle: unknown;

  constructor(config: GameLoopConfig = {}) {
    this.step = config.step ?? 1 / 60;
    this.maxDelta = config.maxDelta ?? 0.25;
    this.scheduler = config.scheduler ?? browserFrameScheduler;
  }

  /**
   * Starts the game loop.
   */
  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = this.scheduler.now();
    this.frameHandle = this.scheduler.requestFrame(this.loop);
  }

  /**
   * Stops the game loop.
   */
  public stop() {
    this.isRunning = false;
    if (this.frameHandle !== undefined) {
      this.scheduler.cancelFrame(this.frameHandle);
      this.frameHandle = undefined;
    }
  }

  private loop = (currentTime: number) => {
    if (!this.isRunning) return;

    // Use scheduler time if not provided by requestFrame
    const now = currentTime ?? this.scheduler.now();
    let deltaTime = (now - this.lastTime) / 1000;
    this.lastTime = now;

    // Prevent spiral of death
    if (deltaTime > this.maxDelta) {
      deltaTime = this.maxDelta;
    }

    this.accumulator += deltaTime;

    while (this.accumulator >= this.step) {
      this.updateSubscribers.forEach(sub => sub(this.step));
      this.accumulator -= this.step;
    }

    const alpha = this.accumulator / this.step;
    this.renderSubscribers.forEach(sub => sub(alpha));

    this.frameHandle = this.scheduler.requestFrame(this.loop);
  };

  /**
   * Subscribes a callback to be called every fixed update step.
   * @param callback - The callback receiving the fixed delta time.
   * @returns A function to unsubscribe.
   */
  public subscribeUpdate(callback: UpdateCallback): () => void {
    this.updateSubscribers.add(callback);
    return () => this.updateSubscribers.delete(callback);
  }

  /**
   * Subscribes a callback to be called every frame for rendering.
   * @param callback - The callback receiving the interpolation alpha.
   * @returns A function to unsubscribe.
   */
  public subscribeRender(callback: RenderCallback): () => void {
    this.renderSubscribers.add(callback);
    return () => this.renderSubscribers.delete(callback);
  }
}
