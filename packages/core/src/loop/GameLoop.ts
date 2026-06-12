import { FrameScheduler, browserFrameScheduler } from "./FrameScheduler";

export type UpdateListener<T> = (deltaTime: number, state: T) => void;
export type RenderListener = (interpolation: number) => void;

export interface GameLoopConfig {
  maxDeltaMs?: number;
  maxUpdatesPerFrame?: number;
  scheduler?: FrameScheduler;
  fps?: number;
}

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

  public subscribeUpdate<T>(listener: UpdateListener<T>): () => void {
    this.updateListeners.add(listener);
    return () => this.updateListeners.delete(listener);
  }

  public subscribeRender(listener: RenderListener): () => void {
    this.renderListeners.add(listener);
    return () => this.renderListeners.delete(listener);
  }

  private loop = (time: number): void => {
    if (!this.isRunning) return;

    let deltaTime = time - this.lastTime;
    if (deltaTime > this.maxDeltaMs) {
      deltaTime = this.maxDeltaMs;
    }

    this.lastTime = time;
    this.accumulator += deltaTime;

    let updates = 0;
    while (this.accumulator >= this.msPerUpdate && updates < this.maxUpdatesPerFrame) {
      this.update(this.msPerUpdate / 1000);
      this.accumulator -= this.msPerUpdate;
      updates++;
    }

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
