import { World, BlueprintRegistryMap, ComponentRegistry, ComponentType } from "./World";

export type BlueprintArgs<TBlueprints, TId extends keyof TBlueprints> =
  TBlueprints[TId] extends BlueprintDefinition<any, infer TArgs>
    ? TArgs
    : never;

export interface BlueprintDefinition<
  TComponents extends ComponentRegistry,
  TArgs
> {
  spawn(world: World<TComponents, any, any>, entity: number, args: TArgs): void;
}

export class BlueprintRegistry<
  TComponents extends ComponentRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
> {
  private blueprints = new Map<string, BlueprintDefinition<TComponents, any>>();

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
