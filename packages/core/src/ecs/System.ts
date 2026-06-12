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

export abstract class System<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry
> {
  abstract update(world: World<TComponents, TEvents>, deltaTime: number): void;
  onRegister(_world: World<TComponents, TEvents>): void {}
  dispose(): void {}
}
