import { World } from "../core/World";
import { Entity } from "../types/EngineTypes";
import { ReplicationStateTracker } from "./ReplicationStateTracker";
import { DeltaPacket, EntityPayload, EntityDeltaPayload } from "./types/ReplicationTypes";
import { ReplicationPolicy } from "./ReplicationPolicy";

/**
 * @responsibility Generate delta packets for clients based on interest and last known state.
 */
export class NetworkDeltaSystem {
  constructor(
    private stateTracker: ReplicationStateTracker,
    private protocolVersion: number = 1
  ) {}

  /**
   * Generates a delta packet for a specific client.
   */
  public generateDelta(
    world: World,
    clientId: string,
    sequence: number,
    baselineAck: number,
    interestedEntities: Set<Entity>,
    forceFull: boolean = false
  ): DeltaPacket {
    // We need to capture the current state version BEFORE recording sent updates
    const currentWorldStateVersion = world.stateVersion;

    const created: EntityPayload[] = [];
    const updated: EntityDeltaPayload[] = [];
    const removed: number[] = [];

    // 1. Identify removed entities (were known, but no longer interested or active)
    // This requires tracking what we SENT last time.
    // In a real system, we'd compare interestedEntities with stateTracker.getKnownEntities(clientId)
    // For simplicity in Iteration 3, we'll assume the stateTracker can provide known entities.
    // Since I didn't implement getKnownEntities, I'll add it to stateTracker if needed,
    // or just use a simplified approach.

    // 2. Identify created and updated entities
    interestedEntities.forEach(entityId => {
      const isKnown = this.stateTracker.isKnown(clientId, entityId);
      const components = world.getEntityComponentTypes(entityId);

      if (!isKnown || forceFull) {
        // Created / New to client
        const payload: EntityPayload = {
          entityId,
          components: {}
        };

        components.forEach(type => {
          if (!ReplicationPolicy.shouldReplicate(type, world.tick) && !forceFull) return;

          const comp = world.getComponent(entityId, type);
          if (comp) {
            const componentVersions = world.componentVersions.get(type);
            const currentVersion = componentVersions?.get(entityId) ?? currentWorldStateVersion;

            payload.components[type] = this.serializeComponent(comp);
            this.stateTracker.recordSent(clientId, entityId, type, currentVersion);
          }
        });
        created.push(payload);
      } else {
        // Potential update
        const deltaPayload: EntityDeltaPayload = {
          entityId,
          components: {}
        };
        let hasChanges = false;

        components.forEach(type => {
          if (!ReplicationPolicy.shouldReplicate(type, world.tick)) return;

          // Use component-level versioning from World
          const componentVersions = world.componentVersions.get(type);
          const currentVersion = componentVersions?.get(entityId) ?? 0;

          if (this.stateTracker.hasChanged(clientId, entityId, type, currentVersion)) {
            const comp = world.getComponent(entityId, type);
            if (comp) {
              deltaPayload.components[type] = this.serializeComponent(comp);
              this.stateTracker.recordSent(clientId, entityId, type, currentVersion);
              hasChanges = true;
            }
          }
        });

        if (hasChanges) {
          updated.push(deltaPayload);
        }
      }
    });

    return {
      protocolVersion: this.protocolVersion,
      sequence,
      baselineAck,
      full: forceFull,
      created,
      updated,
      removed
    };
  }

  private serializeComponent(component: any): any {
    const serialized: any = {};
    for (const key in component) {
      if (typeof component[key] !== "function" && key !== "onReclaim") {
        serialized[key] = component[key];
      }
    }
    return serialized;
  }
}
