import { World, BlueprintRegistryMap } from "../ecs/World";
import { ComponentRegistry } from "../ecs/Component";
import { EventRegistry } from "../events/EventBus";
import { WorldSnapshot } from "./WorldSnapshot";
import { ComponentCloner } from "./ComponentCloner";
import { RandomService } from "../random/RandomService";
import { GameLoop } from "../loop/GameLoop";

/**
 * Utility for restoring the ECS world state from a snapshot.
 *
 * @remarks
 * Restores the entities, components, and core service states (RNG, accumulator)
 * from a previously captured `WorldSnapshot`.
 *
 * Warning: Restoration is a heavy structural operation. It is intended to
 * reconstruct the serializable state, but non-serializable state or external
 * references held by systems may not be restored unless manually handled.
 */
export class SnapshotRestore {
  public static restore<
    TComponents extends ComponentRegistry = ComponentRegistry,
    TEvents extends EventRegistry = EventRegistry,
    TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
  >(world: World<TComponents, TEvents, TBlueprints>, state: WorldSnapshot): void {
    const w = world as any;

    w.activeEntities = new Set(state.entities);
    w.nextEntityId = state.nextEntityId;
    w.freeEntities = [...state.freeEntities];
    w._structureVersion = state.structureVersion;
    w._stateVersion = state.stateVersion;
    w._tick = state.tick;

    const gameplayRandom = world.getResource<RandomService>("gameplay");
    if (state.rngState !== undefined && gameplayRandom) {
      gameplayRandom.setSeed(state.rngState);
    }

    const gameLoop = world.getResource<GameLoop>("GameLoop");
    if (state.accumulator !== undefined && gameLoop) {
      gameLoop.setAccumulator(state.accumulator);
    }

    w.entityComponentSets.clear();

    const snapshotTypes = Object.keys(state.componentData);
    const componentMaps = w.componentMaps as Map<string, Map<number, any>>;
    const componentIndex = w.componentIndex as Map<string, Set<number>>;

    for (const [type] of componentMaps) {
      if (!snapshotTypes.includes(type)) {
        componentMaps.delete(type);
        componentIndex.delete(type);
      }
    }

    for (const type of snapshotTypes) {
      let storage = componentMaps.get(type);
      let index = componentIndex.get(type);

      if (!storage) {
        storage = new Map<number, any>();
        index = new Set<number>();
        componentMaps.set(type, storage);
        componentIndex.set(type, index);
      }

      const snapshotEntities = state.componentData[type];
      for (const [entityId] of storage) {
        if (snapshotEntities[entityId] === undefined) {
          storage.delete(entityId);
          index!.delete(entityId);
        }
      }

      for (const entityIdStr in snapshotEntities) {
        const entityId = parseInt(entityIdStr);
        const sourceComp = snapshotEntities[entityId];

        let component = storage.get(entityId) as Record<string, unknown>;
        if (!component) {
          component = {} as Record<string, unknown>;
          storage.set(entityId, component);
        }

        for (const key in component) {
          if (!(key in sourceComp)) {
            (component as any)[key] = undefined;
          }
        }

        for (const key in sourceComp) {
          const val = sourceComp[key];
          component[key] = ComponentCloner.cloneComponent(val);
        }

        index!.add(entityId);

        let componentSet = w.entityComponentSets.get(entityId);
        if (!componentSet) {
          componentSet = new Set();
          w.entityComponentSets.set(entityId, componentSet);
        }
        componentSet.add(type);
      }
    }

    const queries = w.queries as Map<string, any>;
    queries.forEach(query => {
      if (typeof query.rebuild === 'function') {
         query.rebuild(w.activeEntities, w.entityComponentSets);
      } else {
        const q = query as any;
        q.entities = new Set<number>();
        w.activeEntities.forEach((entity: number) => {
          const set = w.entityComponentSets.get(entity);
          if (set && query.matches(set)) {
            q.entities.add(entity);
          }
        });
      }
    });
  }
}
