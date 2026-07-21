export interface ReplicationResult {
  totalBytesSentThisTick: number;
  totalSerializationMs: number;
  totalEntitiesFiltered: number;
}

/**
 * Interface representing a network state replication strategy.
 */
export interface ReplicationStrategy {
  replicate(room: any, clients: any[], state: any, tick: number): ReplicationResult;
}
