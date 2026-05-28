import { World } from "./World";
import { ComponentRegistry, BlueprintRegistryMap } from "./Component";
import { EventRegistry } from "./EventBus";

/**
 * Standard phases for system execution order.
 */
export enum SystemPhase {
  Input = "Input",
  Simulation = "Simulation",
  Collision = "Collision",
  GameRules = "GameRules",
  Transform = "Transform",
  Presentation = "Presentation",
}

export interface SystemConfig {
  phase?: SystemPhase | string;
  priority?: number;
}

/**
 * Abstract base class for all ECS Systems.
 */
export abstract class System<
  TComponents extends ComponentRegistry = any,
  TEvents extends EventRegistry = any,
  TBlueprints extends BlueprintRegistryMap<TComponents> = any
> {
  public onRegister(_world: World<TComponents, TEvents, TBlueprints>): void {}

  public onUnregister(_world: World<TComponents, TEvents, TBlueprints>): void {}

  abstract update(world: World<TComponents, TEvents, TBlueprints>, deltaTime: number): void;

  public dispose(): void {}
}
