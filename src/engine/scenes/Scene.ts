import { World } from "../core/World";

/**
 * Abstract base class for all game scenes.
 * A scene represents a specific logical state (e.g., Menu, Gameplay, Game Over).
 * It manages its own ECS World context and provides lifecycle hooks.
 *
 * @responsibility Orchestrate the initialization and cleanup of entities and systems for a specific game state.
 * @responsibility Provide an isolated {@link World} context to prevent state leakage between scenes.
 *
 * @remarks
 * Scenes allow segmenting game logic into independent modules.
 * Each scene typically has its own set of systems and entities,
 * simplifying memory management and reducing architectural coupling.
 *
 * @public
 */
export abstract class Scene {
  /**
   * The ECS world associated with this scene.
   * @invariant Each scene possesses a unique World instance unless explicitly shared.
   */
  protected world: World;

  constructor(world: World) {
    this.world = world;
  }

  /** Identifier name for the scene, used for debugging and transitions. */
  public name: string = "Unnamed Scene";

  /**
   * Executed when the scene becomes the active scene in the {@link SceneManager}.
   *
   * @param _world - Reference to the scene's ECS world.
   *
   * @remarks
   * Recommended to initialize scene-specific entities and register systems here.
   *
   * @conceptualRisk [ASYNC_INIT] If logic is asynchronous, ensure systems are
   * fully registered before the first update tick to avoid null references.
   */
  public onEnter(_world: World): void | Promise<void> {}

  /**
   * Executed when the scene is no longer the active scene.
   *
   * @param _world - Reference to the scene's ECS world.
   *
   * @remarks
   * Recommended to release heavy resources, cancel timers, or unregister global listeners here.
   */
  public onExit(_world: World): void | Promise<void> {}

  /**
   * Executed when the engine is paused while this scene is active.
   */
  public onPause(): void {}

  /**
   * Executed when the engine is resumed.
   */
  public onResume(): void {}

  /**
   * Hook for scene-specific asynchronous initialization (loading assets, etc).
   */
  public async init(_world: World): Promise<void> {}

  /**
   * Hook for restarting the scene state.
   */
  public async restart(): Promise<void> {}

  /**
   * Internal hook called during the restart transition to clear shared/stale resources.
   */
  public onRestartCleanup(): void {}

  /**
   * Executed during the simulation update tick (Fixed Step).
   *
   * @param dt - [ms] Elapsed time since last tick (fixedDeltaTime).
   * @param world - The {@link World} associated with the scene.
   *
   * @remarks
   * By default, delegates the update to `world.update(dt)`. Scenes may override
   * this to add orchestration logic before or after system execution.
   */
  public onUpdate(dt: number, world: World): void {
    world.update(dt);
  }

  /**
   * Executed during the rendering pass.
   * @param _alpha - [0, 1] Interpolation factor for smooth visuals.
   */
  public onRender(_alpha: number): void {}

  /**
   * Returns the ECS World of this scene.
   */
  public getWorld(): World {
    return this.world;
  }

  // ==========================================================================
  // LEGACY COMPATIBILITY
  // ==========================================================================

  /**
   * @deprecated Use the standard {@link onUpdate} flow.
   */
  public update(dt: number): void {
    this.onUpdate(dt, this.world);
  }

  /**
   * @deprecated Delegate rendering to {@link Renderer.render}.
   */
  public render(renderer: import("../rendering/Renderer").Renderer): void {
    renderer.render(this.world);
  }
}
