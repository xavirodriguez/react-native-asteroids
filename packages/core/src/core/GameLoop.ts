export type RenderCallback = (alpha: number) => void;

export interface FrameScheduler {
  now(): number;
  requestFrame(callback: (time: number) => void): unknown;
  cancelFrame(handle: unknown): void;
}

export const browserFrameScheduler: FrameScheduler = {
  now: () => (globalThis as any).performance?.now?.() ?? Date.now(),
  requestFrame: (callback) => (globalThis as any).requestAnimationFrame(callback),
  cancelFrame: (handle) => (globalThis as any).cancelAnimationFrame(handle as number),
};

export interface GameLoopConfig {
  scheduler?: FrameScheduler;
}

export class GameLoop {
  private subscribers: Set<RenderCallback> = new Set();
  private lastTime = 0;
  private accumulator = 0;
  private readonly step = 1 / 60;
  private isRunning = false;
  private scheduler: FrameScheduler;
  private frameHandle: unknown;

  constructor(config: GameLoopConfig = {}) {
    this.scheduler = config.scheduler ?? browserFrameScheduler;
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = this.scheduler.now();
    this.frameHandle = this.scheduler.requestFrame(this.loop);
  }

  public stop() {
    this.isRunning = false;
    if (this.frameHandle !== undefined) {
      this.scheduler.cancelFrame(this.frameHandle);
      this.frameHandle = undefined;
    }
  }

  private loop = (time: number) => {
    if (!this.isRunning) return;

    const currentTime = time;
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Use a reasonable cap for deltaTime to avoid spiral of death if tab was inactive
    const cappedDeltaTime = Math.min(deltaTime, 0.25);
    this.accumulator += cappedDeltaTime;

    while (this.accumulator >= this.step) {
      // Logic update would go here if GameLoop managed World.update
      // For now it seems intended for rendering orchestration
      this.accumulator -= this.step;
    }

    const alpha = this.accumulator / this.step;
    this.subscribers.forEach(sub => sub(alpha));

    if (this.isRunning) {
      this.frameHandle = this.scheduler.requestFrame(this.loop);
    }
  };

  public subscribeRender(callback: RenderCallback): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }
}
