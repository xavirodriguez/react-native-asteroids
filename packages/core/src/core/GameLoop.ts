export type RenderCallback = (alpha: number) => void;

export class GameLoop {
  private subscribers: Set<RenderCallback> = new Set();
  private lastTime = 0;
  private accumulator = 0;
  private readonly step = 1 / 60;
  private isRunning = false;

  constructor() {}

  public start() {
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop();
  }

  public stop() {
    this.isRunning = false;
  }

  private loop = () => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    this.accumulator += deltaTime;

    while (this.accumulator >= this.step) {
      // Logic update would go here if GameLoop managed World.update
      // For now it seems intended for rendering orchestration
      this.accumulator -= this.step;
    }

    const alpha = this.accumulator / this.step;
    this.subscribers.forEach(sub => sub(alpha));

    requestAnimationFrame(this.loop);
  };

  public subscribeRender(callback: RenderCallback): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }
}
