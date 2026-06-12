import { ComponentRegistry } from "./Component";
import { World, BlueprintDefinition } from "./World";

export class BlueprintRegistry<
  TComponents extends ComponentRegistry,
  TBlueprints extends Record<string, BlueprintDefinition<TComponents, any>>
> {
  private blueprints = new Map<keyof TBlueprints, BlueprintDefinition<TComponents, any>>();

  register<K extends keyof TBlueprints>(id: K, blueprint: TBlueprints[K]): void {
    this.blueprints.set(id, blueprint);
  }

  get<K extends keyof TBlueprints>(id: K): TBlueprints[K] | undefined {
    return this.blueprints.get(id) as TBlueprints[K];
  }
}
