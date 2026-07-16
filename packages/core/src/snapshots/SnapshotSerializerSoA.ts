import { ComponentCloner } from "../ecs/ComponentCloner";
import { ComponentRegistry } from "../ecs/Component";
import { World } from "../ecs/World";
import { WorldSnapshot, SoAComponentTypeData } from "./WorldSnapshot";

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

/**
 * Structure of Arrays (SoA) Serializer for high performance snapshots.
 *
 * @remarks
 * serializes world component state into continuous TypedArrays (Float64Array and Int32Array)
 * to avoid allocations of thousands of separate object and key-value maps.
 * @public
 */
export class SnapshotSerializerSoA {
  /**
   * Captures the world state in a highly packed, allocation-free Structure of Arrays layout.
   */
  public static snapshot<TComponents extends ComponentRegistry>(
    world: World<TComponents>
  ): WorldSnapshot {
    const internal = world as unknown as InternalWorldAccess<TComponents>;
    const activeEntities = internal.activeEntities;
    const componentMaps = internal.componentMaps;

    const soaComponentData: Record<string, SoAComponentTypeData> = {};

    componentMaps.forEach((map, type) => {
      // 1. Gather active entities with this component
      const entitiesWithComponent: number[] = [];
      map.forEach((_comp, entity) => {
        if (activeEntities.has(entity)) {
          entitiesWithComponent.push(entity);
        }
      });

      if (entitiesWithComponent.length === 0) return;

      // Ensure stable determinism by sorting entity IDs
      entitiesWithComponent.sort((a, b) => a - b);

      // 2. Dynamically gather and sort all component property keys to define stable schema
      const keySet = new Set<string>();
      const nonNumericKeysSet = new Set<string>();
      entitiesWithComponent.forEach(entity => {
        const comp = map.get(entity) as Record<string, unknown>;
        if (!comp) return;
        for (const k in comp) {
          if (k !== "type" && typeof comp[k] !== "function") {
            keySet.add(k);
            const val = comp[k];
            if (val !== null && typeof val !== "number" && typeof val !== "boolean") {
              nonNumericKeysSet.add(k);
            }
          }
        }
      });
      const keys = Array.from(keySet).sort();

      const numEntities = entitiesWithComponent.length;
      const numKeys = keys.length;
      const hasNonNumericSchema = nonNumericKeysSet.size > 0;

      // 3. Allocate flat continuous buffers (avoid allocating non-numeric array if schema is purely numeric)
      const entitiesArray = new Int32Array(entitiesWithComponent);
      const valuesArray = new Float64Array(numEntities * numKeys);
      const nonNumericValues: any[] | undefined = hasNonNumericSchema ? new Array(numEntities * numKeys) : undefined;
      const booleanKeysSet = new Set<string>();

      // 4. Fill buffers efficiently
      for (let i = 0; i < numEntities; i++) {
        const entity = entitiesWithComponent[i];
        const comp = map.get(entity) as Record<string, unknown>;
        for (let j = 0; j < numKeys; j++) {
          const key = keys[j];
          const val = comp[key];
          const offset = i * numKeys + j;

          if (typeof val === "number") {
            valuesArray[offset] = val;
          } else if (typeof val === "boolean") {
            valuesArray[offset] = val ? 1 : 0;
            booleanKeysSet.add(key);
          } else {
            valuesArray[offset] = 0;
            if (nonNumericValues && val !== undefined && val !== null) {
              nonNumericValues[offset] = ComponentCloner.cloneComponent(val);
            }
          }
        }
      }

      soaComponentData[type] = {
        keys,
        entities: entitiesArray,
        values: valuesArray,
        nonNumericValues: nonNumericValues,
        booleanKeys: booleanKeysSet.size > 0 ? Array.from(booleanKeysSet) : undefined
      };
    });

    return {
      entities: Array.from(activeEntities).sort((a, b) => a - b),
      componentData: {}, // Empty in SoA mode to avoid duplicate storage
      nextEntityId: internal.nextEntityId,
      freeEntities: [...internal.freeEntities],
      structureVersion: world.structureVersion,
      stateVersion: world.stateVersion,
      seed: world.gameplayRandom.getSeed(),
      rngState: world.gameplayRandom.getSeed(),
      tick: world.tick,
      isSoA: true,
      soaComponentData
    };
  }
}
