import { ReplicationStrategy, ReplicationResult } from "./ReplicationStrategy";

export class InterestReplicationStrategy implements ReplicationStrategy {
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

      const snapshot = room.world.snapshot();
      if (!isNew) {
        snapshot.entities = snapshot.entities.filter((id: number) => interestIds.has(id));
        for (const type in snapshot.componentData) {
          for (const id in snapshot.componentData[type]) {
            if (!interestIds.has(parseInt(id))) {
              delete snapshot.componentData[type][id];
            }
          }
        }
      }

      const serialized = JSON.stringify(snapshot);
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
