import { World, BlueprintRegistryMap } from "../ecs/World";
import { ComponentRegistry } from "../ecs/Component";

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
import { EventRegistry, EventBus } from "../events/EventBus";
import { BlueprintRegistry } from "../ecs/BlueprintRegistry";
import { CoreComponentRegistry } from "../ecs/CoreComponents";

/**
 * Base class for game implementations using the TinyAster engine.
 *
 * @typeParam TState - The structure of the game state.
 * @typeParam TInput - The structure of game input commands.
 * @typeParam TComponents - The registry of components available in this game.
 * @typeParam TEvents - The registry of events that can be emitted.
 * @typeParam TBlueprints - The registry of blueprints that can be spawned.
 */
export abstract class BaseGame<
  TState,
  _TInput extends Record<string, unknown>,
  TComponents extends ComponentRegistry = CoreComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
> {
  protected world: World<TComponents, TEvents, TBlueprints>;
  protected eventBus: EventBus<TEvents>;
  protected blueprints: BlueprintRegistry<TComponents, TBlueprints>;

  constructor() {
    this.world = new World<TComponents, TEvents, TBlueprints>();
    this.eventBus = new EventBus<TEvents>();
    this.blueprints = new BlueprintRegistry<TComponents, TBlueprints>();

    // Register the blueprint registry as a world resource for the command buffer
    this.world.setResource("BlueprintRegistry", this.blueprints);
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
   * Subclasses should implement this to register all necessary ECS systems.
   */
  protected abstract registerSystems(): void;

  /**
   * Subclasses should implement this to initialize the starting entities.
   */
  protected abstract initializeEntities(): void;

  /**
   * Returns a snapshot representing the current game state.
   *
   * @remarks
   * The returned state is intended to be serializable to support features like
   * rollback or replay, though this depends on the serializability of the
   * implementation of the `TState` structure and its components.
   */
  abstract getGameState(): TState;

  /**
   * Returns whether the game has ended.
   */
  abstract isGameOver(): boolean;
}
