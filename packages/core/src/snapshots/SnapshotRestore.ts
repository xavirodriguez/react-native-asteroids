import { ComponentCloner } from "../ecs/ComponentCloner";
import { ComponentRegistry } from "../ecs/Component";
import { World } from "../ecs/World";
import { WorldSnapshot } from "./WorldSnapshot";

export class SnapshotRestore {
  /**
   * Restores the world state from a snapshot.
   *
   * @remarks
   * This method performs a restoration of entities and components from the snapshot,
   * rebuilding internal indexes and queries. It is a computationally expensive
   * operation intended for scene transitions, rollback, or game loading.
   *
   * @warning
   * - **Restores serializable state**: This only restores the serializable state captured in
   *   the snapshot (primitive values, plain objects/arrays).
   * - **Manual state management**: Any transient state, non-serializable resources (e.g. textures,
   *   audio buffers), or external subscriptions are not captured and should be managed
   *   or re-initialized manually after this call.
   *
   * @param world - The world instance to restore.
   * @param state - The snapshot to restore.
   */
  public static restore<TComponents extends ComponentRegistry>(
    world: World<TComponents>,
    state: WorldSnapshot
  ): void {
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

    for (const type in state.componentData) {
      const storage = new Map<number, any>();
      const index = new Set<number>();
      const versions = new Map<number, number>();

      // @ts-ignore
      world["componentMaps"].set(type, storage);
      // @ts-ignore
      world["componentIndex"].set(type, index);
      // @ts-ignore
      world["componentVersions"].set(type, versions);

      const snapshotEntities = state.componentData[type];
      for (const entityIdStr in snapshotEntities) {
        const entityId = parseInt(entityIdStr);
        const sourceComp = snapshotEntities[entityId];
        const component = ComponentCloner.cloneComponent(sourceComp);

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
