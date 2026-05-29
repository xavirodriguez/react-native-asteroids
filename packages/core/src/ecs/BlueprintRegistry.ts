import { ComponentRegistry } from "./Component";
import { BlueprintRegistryMap } from "./World";

/**
 * Registry for managing entity blueprints.
 */
export class BlueprintRegistry<
  TComponents extends ComponentRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
> {
  private registry = new Map<keyof TBlueprints, TBlueprints[keyof TBlueprints]>();

  /**
   * Registers a blueprint definition.
   */
  register<TId extends keyof TBlueprints & string>(
    id: TId,
    blueprint: TBlueprints[TId]
  ): void {
    this.registry.set(id, blueprint);
  }

  /**
   * Retrieves a registered blueprint.
   */
  get<TId extends keyof TBlueprints & string>(
    id: TId
  ): TBlueprints[TId] | undefined {
    return this.registry.get(id) as TBlueprints[TId] | undefined;
  }

  /**
   * Checks if a blueprint is registered.
   */
  has<TId extends keyof TBlueprints & string>(id: TId): boolean {
    return this.registry.has(id);
  }

  /**
   * Clears all registered blueprints.
   */
  clear(): void {
    this.registry.clear();
  }
}
