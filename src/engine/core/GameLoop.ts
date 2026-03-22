import { World } from "./World";

/**
 * Manages the game heartbeat and system updates.
 */
export class GameLoop {
  private world: World;
  private isRunning: boolean = false;
  private lastTime: number = 0;
  private gameLoopId?: number;
  private maxDeltaTime: number = 100;
  private listeners: Set<(deltaTime: number) => void> = new Set();

  constructor(world: World) {
    this.world = world;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop();
  }

  public stop(): void {
    if (this.gameLoopId) {
      cancelAnimationFrame(this.gameLoopId);
      this.gameLoopId = undefined;
    }
    this.isRunning = false;
  }

  public subscribe(listener: (deltaTime: number) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private loop = (): void => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    let deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Cap delta time to prevent physics explosions
    deltaTime = Math.min(deltaTime, this.maxDeltaTime);

    this.world.update(deltaTime);
    this.listeners.forEach((listener) => listener(deltaTime));

    this.gameLoopId = requestAnimationFrame(this.loop);
  };
}
