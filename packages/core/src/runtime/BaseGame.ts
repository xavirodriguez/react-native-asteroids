import { World, BlueprintRegistryMap } from "../ecs/World";
import { ComponentRegistry } from "../ecs/Component";
import { EventRegistry, EventBus } from "../events/EventBus";
import { BlueprintRegistry } from "../ecs/BlueprintRegistry";

export interface BaseGameConfig {
  /** [KeyboardEvent.code] Key to toggle pause. */
  pauseKey?: string;
  /** [KeyboardEvent.code] Key to restart the game. */
  restartKey?: string;
  /** Enables multiplayer-specific synchronization logic. */
  isMultiplayer?: boolean;
  /** Global game options, including the initial simulation seed. */
  gameOptions?: Record<string, unknown>;
  /** Runs the game without visual systems or asset loading. Suitable for server-side execution. */
  headless?: boolean;
}

/**
 * Base class for game implementations using the TinyAster engine.
 *
 * @typeParam TComponents - The registry of components available in this game.
 * @typeParam TEvents - The registry of events that can be emitted.
 * @typeParam TBlueprints - The registry of blueprints that can be spawned.
 */
export abstract class BaseGame<
  TComponents extends ComponentRegistry = any,
  TEvents extends EventRegistry = any,
  TBlueprints extends BlueprintRegistryMap<TComponents> = any
> {
  public world: World<TComponents, TEvents, TBlueprints>;
  public eventBus: EventBus<TEvents>;
  public blueprints: BlueprintRegistry<TComponents, TBlueprints>;

  constructor() {
    this.world = new World<TComponents, TEvents, TBlueprints>();
    this.eventBus = new EventBus<TEvents>();
    this.blueprints = new BlueprintRegistry<TComponents, TBlueprints>();

    // Register the blueprint registry as a world resource for the command buffer
    this.world.setResource("BlueprintRegistry", this.blueprints);
    this.world.setResource("EventBus", this.eventBus);
  }

  /**
   * Returns the world instance.
   */
  getWorld(): World<TComponents, TEvents, TBlueprints> {
    return this.world;
  }

  /**
   * Returns the event bus instance.
   */
  getEventBus(): EventBus<TEvents> {
    return this.eventBus;
  }

  /**
   * Called during game initialization.
   */
  public abstract initialize(): Promise<void>;

  /**
   * Updates the game simulation.
   */
  public abstract update(dt: number): void;

  /**
   * Subclasses should implement this to register all necessary ECS systems.
   */
  protected abstract registerSystems(): void;

  /**
   * Subclasses should implement this to initialize the starting entities.
   */
  protected abstract initializeEntities(): void;

  /**
   * Returns a representation of the current game state.
   */
  public abstract getGameState(): any;

  /**
   * Returns whether the game has ended.
   */
  public abstract isGameOver(): boolean;
}
