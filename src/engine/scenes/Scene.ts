/**
 * @packageDocumentation
 * Base Scene abstraction for the game engine.
 * Scenes represent isolated states (e.g., Menu, Playing, Game Over) with their own ECS World.
 */

import { World } from "../core/World";

/**
 * Abstract base class for all game scenes.
 * A scene represents a specific state (e.g., Menu, Playing, Game Over).
 * It manages its own ECS world and provides lifecycle hooks.
 *
 * @remarks
 * Scenes are the primary unit of game state organization. Each scene typically
 * owns a {@link World} instance, ensuring that entities and systems from one scene
 * do not interfere with another.
 *
 * Lifecycle hooks like `onEnter`, `onExit`, and `onUpdate` are called by the
 * {@link SceneManager} during transitions and game loops.
 *
 * @responsibility Orchestrate the initialization and cleanup of entities/systems for a specific game state.
 * @responsibility Provide an isolated context (World) to prevent state leaks between scenes.
 */
export abstract class Scene {
  /**
   * The ECS world associated with this scene.
   * @invariant Each scene owns a unique World instance unless explicitly shared.
   */
  protected world: World;

  /**
   * Creates a new Scene instance.
   * @param world - The ECS world instance to be managed by this scene.
   */
  constructor(world: World) {
    this.world = world;
  }

  /** Identifier name of the scene for debugging and transitions. */
  public name: string = "Unnamed Scene";

  /**
   * Called when the scene becomes the active scene.
   *
   * @param _world - Reference to the scene's world.
   * @contract Must initialize necessary systems and entities.
   *
   * @remarks
   * This is called after the previous scene has exited. Use this to setup
   * the environment, spawn initial entities, and start background music.
   *
   * @conceptualRisk [ASYNC_INIT] If asynchronous, update logic must wait for resolution
   * to avoid null references or incomplete systems.
   */
  public onEnter(_world: World): void | Promise<void> {}

  /**
   * Called when the scene stops being the active scene.
   *
   * @param _world - Reference to the scene's world.
   * @contract Must release heavy resources or cancel pending subscriptions.
   *
   * @remarks
   * Use this to stop sounds, clear UI elements, and dispose of scene-specific assets.
   */
  public onExit(_world: World): void | Promise<void> {}

  /**
   * Called when the game is paused while this scene is active.
   * @remarks Can be used to show a pause menu or stop timers.
   */
  public onPause(): void {}

  /**
   * Called when the game is resumed while this scene is active.
   * @remarks Can be used to hide a pause menu or resume timers.
   */
  public onResume(): void {}

  /**
   * Called to initialize the scene.
   *
   * @param _world - Reference to the scene's world.
   * @remarks
   * Specific initialization logic often called before the scene transition begins.
   */
  public async init(_world: World): Promise<void> {}

  /**
   * Called to restart the scene.
   * @remarks Returns the scene to its initial starting state.
   */
  public async restart(): Promise<void> {}

  /**
   * Called during the simulation update tick.
   *
   * @param dt - Elapsed time in seconds.
   * @param world - The world to update.
   *
   * @executionOrder Typically called by the {@link SceneManager} within the GameLoop.
   * @sideEffect Triggers world.update(dt), which in turn executes all registered ECS systems.
   */
  public onUpdate(dt: number, world: World): void {
    world.update(dt);
  }

  /**
   * Called during the rendering phase.
   *
   * @param _alpha - Interpolation factor for smooth rendering between simulation ticks.
   * @remarks
   * Use this for rendering logic that needs to access scene-specific state
   * but is not handled by the global RenderSystem.
   */
  public onRender(_alpha: number): void {}

  /**
   * Gets the ECS world of this scene.
   * @returns The associated {@link World} instance.
   * @queries world
   */
  public getWorld(): World {
    return this.world;
  }

  /**
   * Forwarding methods for backward compatibility.
   * @param dt - Delta time in seconds.
   * @deprecated Use SceneManager flow or onUpdate directly.
   */
  public update(dt: number): void {
    this.onUpdate(dt, this.world);
  }

  /**
   * Renders the scene using the provided renderer.
   *
   * @param renderer - The renderer instance.
   * @deprecated Delegate rendering to RenderSystem or SceneManager.
   */
  public render(renderer: import("../rendering/Renderer").Renderer): void {
    renderer.render(this.world);
  }
}
