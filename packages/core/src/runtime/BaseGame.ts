import { World, BlueprintRegistryMap } from "../ecs/World";
import { ComponentRegistry } from "../ecs/Component";
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
   * Subclasses should implement this to register all required ECS systems.
   */
  protected abstract registerSystems(): void;

  /**
   * Subclasses should implement this to initialize the starting entities.
   */
  protected abstract initializeEntities(): void;

  /**
   * Returns a serializable snapshot of the game state.
   */
  abstract getGameState(): TState;

  /**
   * Returns whether the game has ended.
   */
  abstract isGameOver(): boolean;
}
