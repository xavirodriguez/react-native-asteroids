import { World } from "../core/World";
import { DeltaPacket, EntityPayload } from "./types/ReplicationTypes";
import { WorldSnapshot } from "../types/EngineTypes";

/**
 * Utility to process network deltas and full state updates generically.
 * Reduces boilerplate in game-specific controllers.
 */
export class NetworkReplicationUtils {
    /**
     * Integrates a delta packet into an existing snapshot.
     */
    public static applyDelta(snapshot: WorldSnapshot, delta: DeltaPacket): void {
        const entitySet = new Set(snapshot.entities);

        if (delta.created) {
            delta.created.forEach((payload: EntityPayload) => {
                const entityId = parseInt(payload.entityId);
                if (!entitySet.has(entityId)) {
                    entitySet.add(entityId);
                    snapshot.entities.push(entityId);
                }
                for (const type in payload.components) {
                    if (!snapshot.componentData[type]) snapshot.componentData[type] = {};
                    snapshot.componentData[type][entityId] = structuredClone(payload.components[type]) as import("../types/EngineTypes").SerializedComponent;
                }
            });
        }

        if (delta.updated) {
            delta.updated.forEach((payload) => {
                const entityId = parseInt(payload.entityId);
                for (const type in payload.components) {
                    if (!snapshot.componentData[type]) snapshot.componentData[type] = {};
                    snapshot.componentData[type][entityId] = structuredClone(payload.components[type]) as import("../types/EngineTypes").SerializedComponent;
                }
            });
        }

        if (delta.removed) {
            delta.removed.forEach((entityIdStr: string) => {
                const entityId = parseInt(entityIdStr);
                entitySet.delete(entityId);
                for (const type in snapshot.componentData) {
                    delete snapshot.componentData[type][entityId];
                }
            });
            snapshot.entities = snapshot.entities.filter(id => entitySet.has(id));
        }

        snapshot.entities.sort((a, b) => a - b);
    }

    /**
     * Helper to find a player's entity ID by session ID.
     */
    public static findEntityBySessionId(world: World, sessionId: string, componentType: string = "Ship"): number | undefined {
        const entities = world.query(componentType);
        return entities.find(e => {
            const comp = world.getComponent(e, componentType);
            return comp && (comp as unknown as { sessionId?: string }).sessionId === sessionId;
        });
    }
}
