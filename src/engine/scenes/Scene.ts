import { World } from "../core/World";

/**
 * Abstract base class for all game scenes.
 * A scene represents a specific state of the game (e.g., Menu, Playing, Game Over).
 * It manages its own ECS world and provides lifecycle hooks.
 */
export abstract class Scene {
  /** The ECS world associated with this scene. */
  protected world: World;

  constructor(world: World) {
    this.world = world;
  }

  public name: string = "Unnamed Scene";

  /**
   * Called when the scene becomes the active scene.
   * Useful for initializing entities and systems.
   */
  public onEnter(world: World): void | Promise<void> {}

  /**
   * Called when the scene is no longer the active scene.
   * Useful for cleanup.
   */
  public onExit(world: World): void | Promise<void> {}

  /**
   * Called when the game is paused while this scene is active.
   */
  public onPause(): void {}

  /**
   * Called when the game is resumed while this scene is active.
   */
  public onResume(): void {}

  /**
   * Called when the game is being updated.
   */
  public onUpdate(dt: number, world: World): void {
    world.update(dt);
  }

  /**
   * Called when the game is being rendered.
   */
  public onRender(alpha: number): void {}

  /**
   * Gets the ECS world for this scene.
   */
  public getWorld(): World {
    return this.world;
  }

  /**
   * Public forwarding methods for backward compatibility.
   */
  public update(dt: number): void {
    this.onUpdate(dt, this.world);
  }

  public render(renderer: any): void {
    renderer.render(this.world);
  }
}
