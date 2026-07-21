import { ReplicationStrategy, ReplicationResult } from "./ReplicationStrategy";

export class LegacyReplicationStrategy implements ReplicationStrategy {
  replicate(room: any, clients: any[], state: any, tick: number): ReplicationResult {
    const fullSerializationStart = Date.now();
    const snapshot = room.world.snapshot();
    const serialized = JSON.stringify(snapshot);
    const totalSerializationMs = Date.now() - fullSerializationStart;
    state.fullWorldState = serialized;
    const totalBytesSentThisTick = serialized.length;

    return {
      totalBytesSentThisTick,
      totalSerializationMs,
      totalEntitiesFiltered: 0,
    };
  }
}
