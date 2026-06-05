import { World, BlueprintRegistryMap } from "../ecs/World";
import { ComponentRegistry } from "../ecs/Component";
import { EventRegistry } from "../events/EventBus";
import { WorldSnapshot, ComponentDataSnapshot, SerializedComponent } from "./WorldSnapshot";
import { ComponentCloner } from "./ComponentCloner";
import { RandomService } from "../random/RandomService";
import { GameLoop } from "../loop/GameLoop";

/**
 * Utility for capturing snapshots of the ECS world state.
 *
 * @remarks
 * The serializer aims to capture the serializable state of all entities and
 * components. It performs cloning of component data to help ensure that the
 * snapshot is decoupled from the live state.
 *
 * @warning
 * Components containing functions, circular references, or complex external
 * objects may not be fully or accurately captured depending on the cloner implementation.
 */
export class SnapshotSerializer {
  public static snapshot<
    TComponents extends ComponentRegistry = ComponentRegistry,
    TEvents extends EventRegistry = EventRegistry,
    TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
  >(world: World<TComponents, TEvents, TBlueprints>, target?: WorldSnapshot): WorldSnapshot {
    const w = world as any;
    const componentData: ComponentDataSnapshot = target?.componentData ?? {};

    const componentMaps = w.componentMaps as Map<string, Map<number, any>>;
    const sortedTypes = Array.from(componentMaps.keys()).sort();

    for (const type of sortedTypes) {
      if (!componentData[type]) {
        componentData[type] = {};
      }
    }

    const allEntities = world.query() as number[];

    for (const entity of allEntities) {
      const componentSet = w.entityComponentSets.get(entity) as Set<string>;
      if (!componentSet) continue;

      for (const type of componentSet) {
        const map = componentMaps.get(type);
        if (!map) continue;
        const component = map.get(entity);
        if (!component) continue;

        let serializedComp = componentData[type][entity] as Record<string, unknown>;
        if (!serializedComp) {
          serializedComp = {};
          componentData[type][entity] = serializedComp as SerializedComponent;
        }

        const compAsRecord = component as unknown as Record<string, unknown>;

        // Clean up properties that no longer exist in the source
        for (const key in serializedComp) {
          if (!(key in compAsRecord)) {
            delete serializedComp[key];
          }
        }

        for (const key in compAsRecord) {
          const val = compAsRecord[key];
          if (typeof val !== "function") {
            serializedComp[key] = ComponentCloner.cloneComponent(val);
          }
        }
      }
    }

    // Cleanup entities/components from target that are no longer in world
    for (const type in componentData) {
      const snapshotEntities = componentData[type];
      for (const entityId in snapshotEntities) {
        if (!world.query(type as any).includes(parseInt(entityId))) {
          delete snapshotEntities[entityId];
        }
      }
    }

    const gameplayRandom = world.getResource<RandomService>("gameplay");
    const gameLoop = world.getResource<GameLoop>("GameLoop");

    const result: WorldSnapshot = {
      entities: [...allEntities],
      componentData,
      nextEntityId: w.nextEntityId,
      freeEntities: [...w.freeEntities],
      structureVersion: w._structureVersion ?? 0,
      stateVersion: w._stateVersion ?? 0,
      rngState: gameplayRandom?.getSeed(),
      accumulator: gameLoop?.getAccumulator(),
      tick: world.tick
    };

    if (target) {
      Object.assign(target, result);
      return target;
    }

    return result;
  }
}
