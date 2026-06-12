import { World } from "./World";
import { ComponentRegistry } from "./Component";
import { EventRegistry } from "../events/EventBus";

export enum SystemPhase {
  Input = "Input",
  Simulation = "Simulation",
  Transform = "Transform",
  Collision = "Collision",
  GameRules = "GameRules",
  Presentation = "Presentation"
}

export interface SystemConfig {
  phase?: SystemPhase | string;
  priority?: number;
}

/**
 * Base class for all ECS Systems.
 * Systems are responsible for the logic that operates on entities and components.
 */
export abstract class System<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry
> {
  /**
   * Called during the world update cycle.
   *
   * @param world - The current world instance.
   * @param deltaTime - Time elapsed since the last update in seconds.
   *
   * @warning **Asynchronous Side Effects**: Simulation systems should generally be synchronous.
   * Asynchronous side effects may lead to non-deterministic behavior or race conditions
   * within the simulation.
   */
  abstract update(world: World<TComponents, TEvents>, deltaTime: number): void;

  /**
   * Called when the system is registered with the world.
   */
  onRegister(_world: World<TComponents, TEvents>): void {}

  /**
   * Called when the system is removed or the world is cleared.
   * Use this for cleaning up event listeners or external resources.
   */
  dispose(): void {}
}
