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
