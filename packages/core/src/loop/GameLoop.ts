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
  /**
   * If true, the loop will not automatically schedule frames.
   * Useful when an external driver (like Reanimated) calls `tick()` manually.
   */
  manual?: boolean;
}

/**
 * A platform-agnostic game loop implementation using a fixed-timestep accumulator.
 *
 * @remarks
 * This loop is designed to support a consistent internal simulation frequency
 * (fixed timestep target) independent of the rendering framerate.
 *
 * @warning
 * **Spiral of Death Mitigation**: Under heavy load, if the simulation (update) takes longer
 * than the available frame time, the loop will clamp `deltaTime` to `maxDelta`.
 * In such cases, the simulation will not catch up with real-time, causing a "slow-motion"
 * effect relative to the wall clock. This prevents an unrecoverable lag accumulation
 * (spiral of death) but means that the simulation tick count will fall behind real-time.
 */
export class GameLoop {
  private renderSubscribers: Set<RenderCallback> = new Set();
  private updateSubscribers: Set<UpdateCallback> = new Set();
  private lastTime = 0;
  private accumulator = 0;
  private readonly step: number;
  private readonly maxDelta: number;
  private readonly scheduler: FrameScheduler;
  public manual: boolean;
  private isRunning = false;
  private frameHandle: unknown;

  constructor(config: GameLoopConfig = {}) {
    this.step = config.step ?? 1 / 60;
    this.maxDelta = config.maxDelta ?? 0.25;
    this.scheduler = config.scheduler ?? browserFrameScheduler;
    this.manual = config.manual ?? false;
  }

  /**
   * Starts the game loop.
   */
  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = this.scheduler.now();
    if (!this.manual) {
      this.frameHandle = this.scheduler.requestFrame(this.loop);
    }
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

  /**
   * Stops the internal automatic loop and switches to manual mode.
   */
  public stopInternalLoop() {
    this.manual = true;
    if (this.frameHandle !== undefined) {
      this.scheduler.cancelFrame(this.frameHandle);
      this.frameHandle = undefined;
    }
  }

  /**
   * Executes a single tick of the game loop.
   * @param currentTime - The current time in milliseconds. If not provided, the scheduler's time is used.
   */
  public tick(currentTime?: number) {
    if (!this.isRunning) return;

    // Use scheduler time if not provided
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
  }

  private loop = (currentTime: number) => {
    this.tick(currentTime);

    if (this.isRunning && !this.manual) {
      this.frameHandle = this.scheduler.requestFrame(this.loop);
    }
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
