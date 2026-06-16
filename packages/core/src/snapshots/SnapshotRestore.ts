import { ComponentCloner } from "../ecs/ComponentCloner";
import { ComponentRegistry } from "../ecs/Component";
import { World } from "../ecs/World";
import { WorldSnapshot } from "./WorldSnapshot";

export class SnapshotRestore {
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
