import { World } from "../core/World";
import { Renderer } from "../rendering/Renderer";

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

  /**
   * Called when the scene becomes the active scene.
   * Useful for initializing entities and systems.
   */
  public onEnter(): void | Promise<void> {}

  /**
   * Called when the scene is no longer the active scene.
   * Useful for cleanup.
   */
  public onExit(): void | Promise<void> {}

  /**
   * Called when the game is paused while this scene is active.
   */
  public onPause(): void | Promise<void> {}

  /**
   * Called when the game is resumed while this scene is active.
   */
  public onResume(): void | Promise<void> {}

  /**
   * Updates the scene logic.
   * Defaults to updating the scene's ECS world.
   *
   * @param deltaTime - Time elapsed since the last update in milliseconds.
   */
  public update(deltaTime: number): void {
    this.world.update(deltaTime);
  }

  /**
   * Renders the scene.
   * Defaults to rendering the scene's ECS world using the provided renderer.
   *
   * @param renderer - The renderer instance to use.
   */
  public render(renderer: Renderer): void {
    renderer.render(this.world);
  }

  /**
   * Gets the ECS world for this scene.
   */
  public getWorld(): World {
    return this.world;
  }
}
