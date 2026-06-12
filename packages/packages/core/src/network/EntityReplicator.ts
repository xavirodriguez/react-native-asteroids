import { World } from "../ecs/World";

/**
 * Manages the mapping between server-side entity IDs (strings) and local ECS entity IDs (numbers).
 *
 * @remarks
 * Provides utilities for creating and cleaning up networked entities. This mapping is
 * essential for consistent synchronization but is subject to local {@link Entity} ID
 * availability and lifecycle management in the {@link World}.
 */
export class EntityReplicator {
    private serverToLocal = new Map<string, number>();

    /**
     * Gets the local entity ID for a server-side ID.
     * Returns undefined if not found.
     */
    public getLocalId(serverId: string): number | undefined {
        return this.serverToLocal.get(serverId);
    }

    /**
     * Resolves a local entity for the given server ID.
     * If not found, it attempts to create one and register the mapping.
     */
    public resolveEntity(serverId: string, world: World): number {
        let localId = this.serverToLocal.get(serverId);

        if (localId === undefined || !world.hasEntity(localId)) {
            localId = world.reserveEntityId();
            this.serverToLocal.set(serverId, localId);
            world.getCommandBuffer().createEntity(localId);
        }

        return localId;
    }

    /**
     * Unregisters a mapping and returns the local ID if it existed.
     */
    public removeMapping(serverId: string): number | undefined {
        const localId = this.serverToLocal.get(serverId);
        this.serverToLocal.delete(serverId);
        return localId;
    }

    /**
     * Returns all registered mappings.
     */
    public getMappings(): Map<string, number> {
        return new Map(this.serverToLocal);
    }

    /**
     * Clears all mappings.
     */
    public clear(): void {
        this.serverToLocal.clear();
    }
}
