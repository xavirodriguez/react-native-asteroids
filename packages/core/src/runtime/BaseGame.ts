import { World, ComponentRegistry, BlueprintRegistryMap, ComponentType } from "../ecs/World";
import { Component } from "../ecs/Component";
import { Entity } from "../ecs/Entity";
import { EventRegistry, EventBus } from "../events/EventBus";
import { BlueprintRegistry } from "../ecs/BlueprintRegistry";
import { IGame } from "./IGame";
import { GameLoop } from "../loop/GameLoop";
import { InputSystem } from "../input/InputSystem";
import { UnifiedInputSystem } from "../input/UnifiedInputSystem";

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
 * @typeParam TState - The representation of the game state.
 * @typeParam TInput - The representation of the input state.
 * @typeParam TComponents - The registry of components available in this game.
 * @typeParam TEvents - The registry of events that can be emitted.
 * @typeParam TBlueprints - The registry of blueprints that can be spawned.
 */
export abstract class BaseGame<
  TState = unknown,
  TInput extends Record<string, any> = Record<string, any>,
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
> implements IGame<TState> {
  public world: World<TComponents, TEvents, TBlueprints>;
  public eventBus: EventBus<TEvents>;
  public blueprints: BlueprintRegistry<TComponents, TBlueprints>;
  protected loop: GameLoop;
  protected unifiedInput: UnifiedInputSystem;
  protected _config: BaseGameConfig;
  private isPaused = false;

  constructor(config: BaseGameConfig = {}) {
    this._config = config;
    this.world = new World<TComponents, TEvents, TBlueprints>();
    this.eventBus = new EventBus<TEvents>();
    this.blueprints = new BlueprintRegistry<TComponents, TBlueprints>();
    this.loop = new GameLoop();
    this.unifiedInput = new UnifiedInputSystem();

    this.registerInternalResources();

    // Subscribe loop to update
    this.loop.subscribeUpdate((dt) => {
      if (!this.isPaused) {
        this.update(dt);
      }
    });
  }

  private registerInternalResources(): void {
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
   * Returns the input system instance.
   */
  getInputSystem(): InputSystem {
    return this.unifiedInput;
  }

  /**
   * Returns the game loop instance.
   */
  public getGameLoop(): GameLoop {
    return this.loop;
  }

  /**
   * Called during game initialization.
   * Invokes internal initialize().
   */
  public async init(): Promise<void> {
    await this.initialize();
  }

  /**
   * Internal initialization logic.
   */
  public abstract initialize(): Promise<void>;

  /**
   * Starts the game loop.
   */
  public start(): void {
    this.loop.start();
  }

  /**
   * Pauses the game.
   */
  public pause(): void {
    this.isPaused = true;
  }

  /**
   * Resumes the game.
   */
  public resume(): void {
    this.isPaused = false;
  }

  /**
   * Returns whether the game is currently paused.
   */
  public isPausedState(): boolean {
    return this.isPaused;
  }

  /**
   * Stops the loop and cleans up resources.
   */
  public destroy(): void {
    this.loop.stop();
  }

  /**
   * Restarts the game.
   */
  public async restart(seed?: number): Promise<void> {
    if (seed !== undefined) {
      this._config.gameOptions = { ...this._config.gameOptions, seed };
    }
    this.destroy();

    // Reset world and re-register resources
    this.world = new World<TComponents, TEvents, TBlueprints>();
    this.registerInternalResources();

    // Re-register systems and initialize entities
    this.registerSystems();
    this.initializeEntities();
    this.start();
  }

  /**
   * Subscribes to state updates.
   * Note: For now, we use the loop's render subscription to notify the state.
   */
  public subscribe(cb: (state: TState) => void): () => void {
    return this.loop.subscribeRender(() => {
      cb(this.getGameState());
    });
  }

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
  public abstract getGameState(): TState;

  /**
   * Returns the seed used for the game session.
   */
  public getSeed(): number {
    return (this._config.gameOptions?.seed as number) ?? 0;
  }

  /**
   * Returns whether the game has ended.
   */
  public abstract isGameOver(): boolean;

  /**
   * Helper to handle deferred or immediate entity creation and component attachment.
   */
  protected createBaseEntity(deferred?: boolean): { entity: Entity; add: <K extends ComponentType<TComponents>>(comp: TComponents[K] & { type: K }) => void } {
    const isUpdating = this.world.isUpdating;
    const isDeferred = !!(deferred || isUpdating);
    const commands = this.world.getCommandBuffer();

    if (isDeferred) {
      const entity = this.world.reserveEntityId();
      commands.createEntity(entity);
      return {
        entity,
        add: <K extends ComponentType<TComponents>>(comp: TComponents[K] & { type: K }) => {
          commands.addComponent(entity, comp);
        }
      };
    }

    const entity = this.world.createEntity();
    return {
      entity,
      add: <K extends ComponentType<TComponents>>(comp: TComponents[K] & { type: K }) => this.world.addComponent(entity, comp)
    };
  }
}
