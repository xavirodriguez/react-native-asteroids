/**
 * Manages the game heartbeat and system updates using a fixed timestep.
 *
 * @remarks
 * Uses an accumulator pattern to ensure consistent physics/logic updates (60 FPS)
 * regardless of the rendering framerate.
 */
export class GameLoop {
  private isRunning: boolean = false;
  private lastTime: number = 0;
  private gameLoopId?: number;
  private accumulator: number = 0;

  /** Fixed timestep for logic updates (60 FPS = 16.66ms) */
  private readonly fixedDeltaTime: number = 1000 / 60;
  /** Maximum elapsed time allowed in a single frame to prevent "spiral of death" */
  private readonly maxDeltaTime: number = 100;

  private updateListeners: Set<(deltaTime: number) => void> = new Set();
  private renderListeners: Set<(deltaTime: number, alpha: number) => void> = new Set();

  constructor() {}

  /**
   * Starts the game loop.
   */
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.gameLoopId = requestAnimationFrame(this.loop);
  }

  /**
   * Stops the game loop.
   */
  public stop(): void {
    if (this.gameLoopId !== undefined) {
      cancelAnimationFrame(this.gameLoopId);
      this.gameLoopId = undefined;
    }
    this.isRunning = false;
  }

  /**
   * Subscribes a listener to the update phase (fixed timestep).
   *
   * @param listener - Callback function.
   * @returns Unsubscribe function.
   */
  public subscribeUpdate(listener: (deltaTime: number) => void): () => void {
    this.updateListeners.add(listener);
    return () => this.updateListeners.delete(listener);
  }

  /**
   * Subscribes a listener to the render phase (variable framerate).
   *
   * @param listener - Callback function.
   * @returns Unsubscribe function.
   */
  public subscribeRender(listener: (deltaTime: number, alpha: number) => void): () => void {
    this.renderListeners.add(listener);
    return () => this.renderListeners.delete(listener);
  }

  /**
   * Legacy subscribe method for backward compatibility.
   * Maps to render subscription.
   */
  public subscribe(listener: (deltaTime: number, alpha: number) => void): () => void {
    return this.subscribeRender(listener);
  }

  /**
   * The main loop execution.
   */
  private loop = (currentTime: number): void => {
    if (!this.isRunning) return;

    let deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Cap delta time to prevent spiral of death
    if (deltaTime > this.maxDeltaTime) {
      deltaTime = this.maxDeltaTime;
    }

    this.accumulator += deltaTime;

    // Fixed timestep updates
    while (this.accumulator >= this.fixedDeltaTime) {
      this.updateListeners.forEach((listener) => listener(this.fixedDeltaTime));
      this.accumulator -= this.fixedDeltaTime;
    }

    // Render phase
    const alpha = this.accumulator / this.fixedDeltaTime;
    this.renderListeners.forEach((listener) => listener(deltaTime, alpha));

    this.gameLoopId = requestAnimationFrame(this.loop);
  };
}
