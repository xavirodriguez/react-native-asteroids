import { ComponentCloner } from "../ecs/ComponentCloner";
import { ComponentRegistry } from "../ecs/Component";
import { World } from "../ecs/World";
import { WorldSnapshot } from "./WorldSnapshot";

/**
 * Structure of Arrays (SoA) Restoration utility.
 *
 * @remarks
 * Restores world component state from structured SoA snapshots, rebuilding
 * internal ECS maps and index indices with high performance.
 */
export class SnapshotRestoreSoA {
  /**
   * Restores the world state from a highly packed SoA snapshot.
   */
  public static restore<TComponents extends ComponentRegistry>(
    world: World<TComponents>,
    state: WorldSnapshot
  ): void {
    if (!state.isSoA || !state.soaComponentData) {
      throw new Error("[SnapshotRestoreSoA] State snapshot is not formatted as SoA.");
    }

    // @ts-ignore
    world["activeEntities"] = new Set(state.entities);
    // @ts-ignore
    world["nextEntityId"] = state.nextEntityId;
    // @ts-ignore
    world["freeEntities"] = [...state.freeEntities];
    // @ts-ignore
    world["_structureVersion"] = state.structureVersion;
    // @ts-ignore
    world["_stateVersion"] = state.stateVersion;
    // @ts-ignore
    world["_tick"] = state.tick;

    if (state.rngState !== undefined) {
      world.gameplayRandom.setSeed(state.rngState);
    } else if (state.seed !== undefined) {
      world.gameplayRandom.setSeed(state.seed);
    }

    // @ts-ignore
    world["entityComponentSets"].clear();
    // @ts-ignore
    world["componentMaps"].clear();
    // @ts-ignore
    world["componentIndex"].clear();
    // @ts-ignore
    world["componentVersions"].clear();

    const soaComponentData = state.soaComponentData;

    for (const type in soaComponentData) {
      const storage = new Map<number, any>();
      const index = new Set<number>();
      const versions = new Map<number, number>();

      // @ts-ignore
      world["componentMaps"].set(type, storage);
      // @ts-ignore
      world["componentIndex"].set(type, index);
      // @ts-ignore
      world["componentVersions"].set(type, versions);

      const soaData = soaComponentData[type];
      const keys = soaData.keys;
      const numKeys = keys.length;
      const entities = soaData.entities;
      const numEntities = entities.length;
      const values = soaData.values;
      const nonNumericValues = soaData.nonNumericValues;
      const booleanKeys = soaData.booleanKeys ? new Set(soaData.booleanKeys) : null;

      for (let i = 0; i < numEntities; i++) {
        const entityId = entities[i];

        // Reconstruct component instance dynamically
        const component: Record<string, any> = { type };

        for (let j = 0; j < numKeys; j++) {
          const key = keys[j];
          const offset = i * numKeys + j;
          const nonNumericVal = nonNumericValues ? nonNumericValues[offset] : undefined;

          if (nonNumericVal !== undefined && nonNumericVal !== null) {
            component[key] = ComponentCloner.cloneComponent(nonNumericVal);
          } else {
            const rawVal = values[offset];
            if (booleanKeys && booleanKeys.has(key)) {
              component[key] = rawVal === 1;
            } else {
              component[key] = rawVal;
            }
          }
        }

        storage.set(entityId, component);
        index.add(entityId);
        // @ts-ignore
        versions.set(entityId, world["_stateVersion"]);

        // @ts-ignore
        let componentSet = world["entityComponentSets"].get(entityId);
        if (!componentSet) {
          componentSet = new Set();
          // @ts-ignore
          world["entityComponentSets"].set(entityId, componentSet);
        }
        componentSet.add(type);
      }
    }

    // @ts-ignore
    world["queries"].forEach(query => {
      // @ts-ignore
      query.rebuild(world["activeEntities"], world["entityComponentSets"]);
    });
  }
}
