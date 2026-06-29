"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnapshotRestore = void 0;
const ComponentCloner_1 = require("../ecs/ComponentCloner");
class SnapshotRestore {
    /**
     * Restores the world state from a snapshot.
     *
     * @remarks
     * This method performs a restoration of entities and components from the snapshot,
     * rebuilding internal indexes and queries. It is a computationally expensive
     * operation intended for scene transitions, rollback, or game loading.
     *
     * @warning
     * - **Restores serializable state**: This operation is intended to restore only the serializable
     *   state captured in the snapshot (primitive values, plain objects/arrays).
     * - **Manual state management**: Transient state, non-serializable resources (e.g., textures,
     *   audio buffers), or external subscriptions are generally not captured and should be managed
     *   or re-initialized manually as needed.
     *
     * @param world - The world instance to restore.
     * @param state - The snapshot to restore.
     */
    static restore(world, state) {
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
        }
        else if (state.seed !== undefined) {
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
            const storage = new Map();
            const index = new Set();
            const versions = new Map();
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
                const component = ComponentCloner_1.ComponentCloner.cloneComponent(sourceComp);
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
exports.SnapshotRestore = SnapshotRestore;
