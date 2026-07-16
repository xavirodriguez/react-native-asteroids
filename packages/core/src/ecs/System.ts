import { World } from "./World";
import { ComponentRegistry } from "./Component";
import { EventRegistry } from "../events/EventBus";

/**
 * Execution phases for systems within the World update loop.
 * @public
 */
export enum SystemPhase {
  /** Input processing and gathering. */
  Input = "Input",
  /** Core game logic and simulation. */
  Simulation = "Simulation",
  /** Coordinate transformations and hierarchy updates. */
  Transform = "Transform",
  /** Collision detection and resolution. */
  Collision = "Collision",
  /** Higher-level game rules and state transitions. */
  GameRules = "GameRules",
  /** Preparation for rendering and visual feedback. */
  Presentation = "Presentation"
}

/** @public */
export interface SystemConfig {
  phase?: SystemPhase | string;
  priority?: number;
}

/**
 * Base class for all systems.
 *
 * @remarks
 * Systems implement the logic that operates on entities and components.
 * They are executed by the {@link World} during its update loop.
 *
 * Systems should ideally be stateless or only maintain limited auxiliary
 * state (like caches or coordination flags) that can be safely discarded or recomputed.
 * Core simulation state should be stored in components within the {@link World} to support
 * features like snapshots, rollback, and replication. Systems that maintain internal
 * simulation state may break these features if that state is not serializable.
 * @public
 */
export abstract class System<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry
> {
  /**
   * Main update logic for the system.
   *
   * @param world - The world instance being updated.
   * @param deltaTime - Time elapsed since the last update.
   */
  public abstract update(world: World<TComponents, TEvents>, deltaTime: number): void;

  /**
   * Called when the system is registered with a world.
   */
  public onRegister(_world: World<TComponents, TEvents>): void {}

  /**
   * Called when the system is removed or the world is cleared.
   */
  public dispose(): void {}
}
