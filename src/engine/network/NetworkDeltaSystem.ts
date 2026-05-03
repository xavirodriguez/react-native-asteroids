import { World } from "../core/World";
import { Entity } from "../types/EngineTypes";
import { ReplicationStateTracker } from "./ReplicationStateTracker";
import { DeltaPacket, EntityPayload, EntityDeltaPayload } from "./types/ReplicationTypes";
import { ReplicationPolicy } from "./ReplicationPolicy";
import { Quantization } from "./Quantization";

/**
 * Network Delta Replication System.
 *
 * Instead of transmitting full world snapshots every tick, this system calculates the
 * differences between the current authoritative state and what each client has
 * previously acknowledged (ACK).
 *
 * @responsibility Generate delta packets based on spatial interest and last known version.
 * @remarks
 * ### Delta Replication Protocol:
 * 1. **Version Tracking**: The server maintains a `ReplicationStateTracker` per client,
 *    mapping `(entityId, componentType)` to the `stateVersion` when it was last sent.
 * 2. **Change Detection**: Compares current component versions in the `World` against
 *    the `baselineAck` (the version of the last state the client confirmed receiving).
 * 3. **Interest Filtering**: Only entities within the client's interest radius (provided
 *    by `InterestManagerSystem`) are considered for updates.
 * 4. **Differential Payload**: The resulting `DeltaPacket` contains:
 *    - `created`: Entities new to the client's interest area (sent with full state).
 *    - `updated`: Components mutated since the client's `baselineAck`.
 *    - `removed`: Entities that were previously known but are now destroyed or out of range.
 *
 * @conceptualRisk [BANDWIDTH][MEDIUM] If too many components change simultaneously,
 * the delta packet size can approach or exceed a full snapshot.
 * @conceptualRisk [CONSISTENCY][HIGH] Relies on clients accurately acknowledging
 * received versions. A missed ACK or incorrect tracking leads to state divergence.
 */
export class NetworkDeltaSystem {
  constructor(
    private stateTracker: ReplicationStateTracker,
    private protocolVersion: number = 1
  ) {}

  /**
   * Generates a delta packet for a specific client.
   *
   * @param world - The source ECS world.
   * @param clientId - Unique identifier for the destination client.
   * @param sequence - Monotonic packet sequence number.
   * @param baselineAck - The last world state version acknowledged by this client.
   * @param interestedEntities - Set of entities relevant to this client (Interest Management).
   * @param forceFull - If true, ignores versioning and sends all interested components.
   *
   * @returns A {@link DeltaPacket} containing created, updated, and removed data.
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
    const removed: string[] = [];

    // 1. Identify removed entities (were known, but no longer interested or active)
    const knownEntities = this.stateTracker.getKnownEntities(clientId);
    knownEntities.forEach(entityId => {
      if (!interestedEntities.has(entityId) || !world.hasEntity(entityId)) {
        removed.push(entityId.toString());
        this.stateTracker.removeEntityForClient(clientId, entityId);
      }
    });

    // 2. Identify created and updated entities
    interestedEntities.forEach(entityId => {
      const isKnown = this.stateTracker.isKnown(clientId, entityId);
      const components = world.getEntityComponentTypes(entityId);

      if (!isKnown || forceFull) {
        // Created / New to client
        const payload: EntityPayload = {
          entityId: entityId.toString(),
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
          entityId: entityId.toString(),
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
    if (component.type === "Transform") {
        return {
            type: "Transform",
            ...Quantization.quantizeTransform(component.x, component.y, component.rotation)
        };
    }

    const serialized: any = {};
    for (const key in component) {
      if (typeof component[key] !== "function" && key !== "onReclaim") {
        serialized[key] = component[key];
      }
    }
    return serialized;
  }
}
