import { ComponentCloner } from "../ecs/ComponentCloner";
import { ComponentRegistry } from "../ecs/Component";
import { World } from "../ecs/World";
import { WorldSnapshot, ComponentDataSnapshot, SerializedComponent } from "./WorldSnapshot";

/**
 * Internal interface to access private world state for serialization.
 */
interface InternalWorldAccess<TComponents extends ComponentRegistry> {
  activeEntities: Set<number>;
  entityComponentSets: Map<number, Set<string>>;
  componentMaps: Map<string, Map<number, unknown>>;
  nextEntityId: number;
  freeEntities: number[];
}

export class SnapshotSerializer {
  /**
   * Captures the current serializable state of the world.
   *
   * @remarks
   * This method captures entities and their components. It is designed to help reduce
   * allocations when a `target` is provided, but still performs deep cloning
   * of component data.
   *
   * @warning
   * **Serialization limits**: This operation is intended to capture only serializable properties
   * (primitive values, plain objects/arrays). Functions, circular references, and complex
   * class instances without a custom cloning path (like Map, Set, or custom classes)
   * may be skipped, partially captured, or result in incomplete state restoration.
   *
   * **Performance & Memory**: This operation is computationally expensive and is expected to
   * increase GC pressure due to deep cloning. Frequent use in performance-critical paths
   * (e.g., every frame) should be carefully considered against the frame budget.
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
    const internal = world as unknown as InternalWorldAccess<TComponents>;

    const activeEntities = internal.activeEntities;
    const entityComponentSets = internal.entityComponentSets;
    const componentMaps = internal.componentMaps;

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
      nextEntityId: internal.nextEntityId,
      freeEntities: [...internal.freeEntities],
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
   * @warning
   * Subject to the same serialization limits as {@link snapshot}.
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
    const internal = world as unknown as InternalWorldAccess<TComponents> & { componentVersions: Map<string, Map<number, number>> };
    const componentMaps = internal.componentMaps;
    const componentVersions = internal.componentVersions;

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
