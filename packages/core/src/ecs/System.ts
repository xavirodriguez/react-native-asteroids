import { World } from "./World";
import { ComponentRegistry } from "./Component";

/**
 * Execution phases for systems.
 */
export enum SystemPhase {
  Input = "Input",
  Simulation = "Simulation",
  Transform = "Transform",
  Collision = "Collision",
  GameRules = "GameRules",
  Presentation = "Presentation"
}

/**
 * Configuration for system registration.
 */
export interface SystemConfig {
  /**
   * The phase in which this system should execute.
   */
  phase?: SystemPhase;
  /**
   * The priority of this system within its phase (higher value = earlier execution).
   */
  priority?: number;
}

/**
 * Abstract base class for all ECS systems.
 */
export abstract class System<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends Record<string, unknown> = Record<string, unknown>
> {
  /**
   * Executed during the world update cycle.
   *
   * @remarks
   * Systems are intended to perform logic over entities matching specific queries.
   * To help maintain simulation consistency, systems should avoid asynchronous
   * side effects or external mutations that are not captured by the world state.
   *
   * @warning
   * Direct structural mutations (entity creation/destruction) should be deferred
   * using the `world.getCommandBuffer()` to support stable iteration over queries.
   */
  abstract update(world: World<TComponents, TEvents, Record<string, any>>, deltaTime: number): void;

  /**
   * Lifecycle hook: intended to be called when the system is added to a world.
   */
  onRegister(_world: World<TComponents, TEvents, Record<string, any>>): void {}

  /**
   * Lifecycle hook: intended to be called when the system is removed from a world.
   */
  onUnregister(_world: World<TComponents, TEvents, Record<string, any>>): void {}

  /**
   * Lifecycle hook: intended to be used for cleaning up resources.
   */
  dispose(): void {}
}
