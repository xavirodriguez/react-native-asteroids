import { World, BlueprintRegistryMap, ComponentRegistry } from "./World";
import { EventRegistry } from "../events/EventBus";

/** @public */
export type BlueprintArgs<TBlueprints, TId extends keyof TBlueprints> =
  TBlueprints[TId] extends BlueprintDefinition<any, any, infer TArgs>
    ? TArgs
    : never;

/** @public */
export interface BlueprintDefinition<
  TComponents extends ComponentRegistry,
  TEvents extends EventRegistry,
  TArgs
> {
  spawn(world: World<TComponents, TEvents, BlueprintRegistryMap<TComponents>>, entity: number, args: TArgs): void;
}

/** @public */
export class BlueprintRegistry<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
> {
  private blueprints = new Map<string, BlueprintDefinition<TComponents, TEvents, any>>();

  register<TId extends keyof TBlueprints & string>(
    id: TId,
    blueprint: TBlueprints[TId]
  ): void {
    this.blueprints.set(id, blueprint);
  }

  get<TId extends keyof TBlueprints & string>(
    id: TId
  ): TBlueprints[TId] | undefined {
    return this.blueprints.get(id) as TBlueprints[TId] | undefined;
  }

  has<TId extends keyof TBlueprints & string>(id: TId): boolean;
  has(id: string): boolean {
    return this.blueprints.has(id);
  }

  clear(): void {
    this.blueprints.clear();
  }
}
