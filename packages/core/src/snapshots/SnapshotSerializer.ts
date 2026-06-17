import { ComponentCloner } from "../ecs/ComponentCloner";
import { ComponentRegistry } from "../ecs/Component";
import { World } from "../ecs/World";
import { WorldSnapshot, ComponentDataSnapshot, SerializedComponent } from "./WorldSnapshot";

export class SnapshotSerializer {
  /**
   * Captures the current serializable state of the world.
   *
   * @remarks
   * This method captures entities and their components. Only serializable properties
   * are included; functions and complex objects without a custom cloning path
   * will be skipped or partially captured.
   *
   * @param world - The world to snapshot.
   * @param target - Optional snapshot object to reuse.
   * @returns A snapshot of the world's entities, components, and RNG state.
   */
  public static snapshot<TComponents extends ComponentRegistry>(
    world: World<TComponents>,
    target?: WorldSnapshot
  ): WorldSnapshot {
    const componentData: ComponentDataSnapshot = target?.componentData ?? {};

    // @ts-ignore
    const activeEntities = world["activeEntities"] as Set<number>;
    // @ts-ignore
    const entityComponentSets = world["entityComponentSets"] as Map<number, Set<string>>;
    // @ts-ignore
    const componentMaps = world["componentMaps"] as Map<string, Map<number, any>>;

    activeEntities.forEach(entity => {
      const componentSet = entityComponentSets.get(entity);
      if (!componentSet) return;

      for (const type of componentSet) {
        const map = componentMaps.get(type);
        if (!map) continue;
        const component = map.get(entity);
        if (!component) continue;

        if (!componentData[type]) componentData[type] = {};

        let serializedComp = componentData[type][entity];
        if (!serializedComp) {
          serializedComp = {};
          componentData[type][entity] = serializedComp;
        }

        const compAsRecord = component as unknown as Record<string, unknown>;
        for (const key in compAsRecord) {
          const val = compAsRecord[key];
          if (typeof val !== "function") {
            serializedComp[key] = ComponentCloner.cloneComponent(val);
          }
        }
      }
    });

    return {
      entities: Array.from(activeEntities).sort((a, b) => a - b),
      componentData,
      nextEntityId: world["nextEntityId"],
      freeEntities: [...world["freeEntities"]],
      structureVersion: world.structureVersion,
      stateVersion: world.stateVersion,
      seed: world.gameplayRandom.getSeed(),
      rngState: world.gameplayRandom.getSeed(),
      tick: world.tick
    };
  }

  /**
   * Captures the changes in component data since a specific version.
   *
   * @remarks
   * Identifies components that have been modified (based on `stateVersion`)
   * and returns their serialized state.
   *
   * @param world - The world to snapshot.
   * @param sinceVersion - The state version to compare against.
   * @returns A partial snapshot containing only the changed components.
   */
  public static deltaSnapshot<TComponents extends ComponentRegistry>(
    world: World<TComponents>,
    sinceVersion: number
  ): Partial<WorldSnapshot> {
    const componentData: ComponentDataSnapshot = {};
    // @ts-ignore
    const componentMaps = world["componentMaps"] as Map<string, Map<number, any>>;
    // @ts-ignore
    const componentVersions = world["componentVersions"] as Map<string, Map<number, number>>;

    componentMaps.forEach((map, type) => {
      const typeVersions = componentVersions.get(type);
      if (!typeVersions) return;

      const typeData: Record<number, SerializedComponent> = {};
      let hasData = false;

      map.forEach((component, entity) => {
        const version = typeVersions.get(entity) ?? 0;
        if (version > sinceVersion) {
          const serializedComp: SerializedComponent = {};
          const compAsRecord = component as unknown as Record<string, unknown>;

          for (const key in compAsRecord) {
            if (typeof compAsRecord[key] !== "function") {
              serializedComp[key] = ComponentCloner.cloneComponent(compAsRecord[key]);
            }
          }
          typeData[entity] = serializedComp;
          hasData = true;
        }
      });

      if (hasData) {
        componentData[type] = typeData;
      }
    });

    return {
      componentData,
      stateVersion: world.stateVersion,
      structureVersion: world.structureVersion,
      tick: world.tick
    };
  }
}
