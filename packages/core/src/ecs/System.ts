import { World } from "./World";
import { ComponentRegistry } from "./Component";
import { EventRegistry } from "../events/EventBus";

/**
 * Execution phases for systems within the World update loop.
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
 */
export abstract class System<
  TComponents extends ComponentRegistry = any,
  TEvents extends EventRegistry = any
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
