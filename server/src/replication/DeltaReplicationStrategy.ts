import { ReplicationStrategy, ReplicationResult } from "./ReplicationStrategy";

export class DeltaReplicationStrategy implements ReplicationStrategy {
  replicate(room: any, clients: any[], state: any, tick: number): ReplicationResult {
    let totalBytesSentThisTick = 0;
    let totalSerializationMs = 0;
    let totalEntitiesFiltered = 0;
    const totalEntitiesInWorld = room.world.entities.length;

    const detailedInterestMap = room.world.getResource("DetailedInterestMap");

    clients.forEach((client: any) => {
      const isNew = room.newClients.has(client.sessionId);
      const interest = detailedInterestMap?.get(client.sessionId) || [];
      const interestIds = new Set(interest.map((e: any) => parseInt(e.entityId)));

      totalEntitiesFiltered += (totalEntitiesInWorld - interestIds.size);

      const serializationStart = Date.now();

      const sequence = room.ackTracker.nextSequence(client.sessionId);
      const baselineAck = room.ackTracker.getLastAckedSequence(client.sessionId);
      const idleTime = room.ackTracker.getIdleTime(client.sessionId);
      const forceFull = idleTime > 3000 || baselineAck === 0;

      const deltaPacket = room.deltaSystem.generateDelta(
        room.world,
        client.sessionId,
        sequence,
        baselineAck,
        interestIds,
        forceFull
      );

      const serialized = JSON.stringify(deltaPacket);
      totalSerializationMs += (Date.now() - serializationStart);
      totalBytesSentThisTick += serialized.length;

      client.send("world_delta", {
        protocolVersion: state.protocolVersion,
        tick: tick,
        delta: serialized
      });

      if (isNew) {
        room.newClients.delete(client.sessionId);
      }
    });

    return {
      totalBytesSentThisTick,
      totalSerializationMs,
      totalEntitiesFiltered,
    };
  }
}
