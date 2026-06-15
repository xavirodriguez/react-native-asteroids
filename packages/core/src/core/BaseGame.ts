import { World } from "../ecs/World";
import { ComponentRegistry } from "../ecs/Component";
import { EventRegistry } from "../events/EventBus";
import { BlueprintRegistryMap } from "../ecs/World";

export abstract class BaseGame<
  TComponents extends ComponentRegistry = any,
  TEvents extends EventRegistry = any,
  TBlueprints extends BlueprintRegistryMap<TComponents> = any
> {
  protected world: World<TComponents, TEvents, TBlueprints>;

  constructor() {
    this.world = new World<TComponents, TEvents, TBlueprints>();
  }

  public abstract initialize(): Promise<void>;
  public abstract update(dt: number): void;

  public getWorld(): World<TComponents, TEvents, TBlueprints> {
    return this.world;
  }
}
