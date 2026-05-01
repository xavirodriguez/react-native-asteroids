/**
 * @responsibility Define common types for network replication and interest management.
 */

/**
 * Levels of interest for an entity relative to a client.
 * Used to prioritize networking updates and frequency.
 */
export type InterestLevel = 'critical' | 'high' | 'medium' | 'low' | 'none';

/**
 * Represents an entity that is relevant to a specific client.
 */
export interface InterestedEntity {
  entityId: number;
  interestLevel: InterestLevel;
  distance: number;
}

/**
 * Common interface for packets that include a protocol version.
 */
export interface NetworkPacket {
  protocolVersion: number;
}

/**
 * Full state of an entity for initial synchronization.
 */
export interface EntityPayload {
  entityId: number;
  components: Record<string, unknown>;
}

/**
 * Partial state of an entity containing only changed components.
 */
export interface EntityDeltaPayload {
  entityId: number;
  components: Record<string, unknown>;
}

/**
 * Granular update packet using delta compression.
 */
export interface DeltaPacket extends NetworkPacket {
  sequence: number;
  baselineAck: number;
  full: boolean;
  created: EntityPayload[];
  updated: EntityDeltaPayload[];
  removed: number[];
}

/**
 * Budget constraints for a single client update.
 */
export interface ClientNetworkBudget {
  maxBytesPerPacket: number;
  maxEntitiesPerPacket: number;
  maxCriticalPerTick: number;
  maxLowPriorityPerSecond: number;
}

/**
 * Policy for how a specific component type should be replicated.
 */
export interface ReplicationSchema {
  componentType: string;
  reliable: boolean;
  sendRate: number; // ticks between sends (1 = every tick)
  importance: 'critical' | 'high' | 'medium' | 'low';
}
