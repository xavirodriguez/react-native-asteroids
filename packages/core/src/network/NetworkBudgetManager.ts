import { ClientNetworkBudget, InterestedEntity } from "./ReplicationTypes";

/**
 * Network Budget Manager.
 *
 * This system ensures that replication packets do not exceed size or complexity
 * constraints, which is critical for maintaining high performance and low latency.
 *
 * @responsibility Filter and prioritize entities to be included in a network update.
 *
 * ### Key strategies:
 * 1. **Priorización por Interés**: Se da prioridad absoluta a las entidades marcadas
 *    como 'critical' o 'high' por el `InterestManager`.
 * 2. **Límite de Bytes**: Se estima el tamaño del paquete y se detiene la inclusión
 *    de entidades si se supera el presupuesto (default 8KB).
 * 3. **Rotación (Fairness)**: Para las entidades de baja prioridad (Low), se utiliza un sistema
 *    de rotación circular con el fin de que reciban actualizaciones periódicas, incluso
 *    si el ancho de banda es limitado.
 */
export class NetworkBudgetManager {
  private lowPriorityRotation = new Map<string, number>(); // clientId -> startIndex

  public static readonly DEFAULT_BUDGET: ClientNetworkBudget = {
    sessionId: "default",
    totalBytes: 0,
    interestLevel: "medium",
    maxBytesPerPacket: 8192, // 8KB
    maxEntitiesPerPacket: 50,
    maxCriticalPerTick: 20,
    maxLowPriorityPerSecond: 5, // Approx. 5 every 60 ticks
  };

  /**
   * Filters and prioritizes entities based on the client's network budget.
   *
   * @param clientId - The ID of the client for rotation tracking.
   * @param entities - The full list of interested entities.
   * @param budget - The network budget configuration.
   * @param selfEntityId - Optional local player entity ID to always prioritize.
   */
  public filterEntities(
    clientId: string,
    entities: InterestedEntity[],
    budget: ClientNetworkBudget = NetworkBudgetManager.DEFAULT_BUDGET,
    selfEntityId?: number | string
  ): InterestedEntity[] {
    const result: InterestedEntity[] = [];
    let currentBytes = 0;

    // 1. Sort by interest level
    const priorityMap: Record<string, number> = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3, 'none': 4 };
    const sorted = [...entities].sort((a, b) => priorityMap[a.interestLevel] - priorityMap[b.interestLevel]);

    const critical = sorted.filter(e => e.interestLevel === 'critical' || e.interestLevel === 'high');
    const medium = sorted.filter(e => e.interestLevel === 'medium');
    const low = sorted.filter(e => e.interestLevel === 'low');

    // Heuristic: estimated bytes per entity based on level (including components and overhead)
    const bytesPerEntity: Record<string, number> = { 'critical': 200, 'high': 150, 'medium': 100, 'low': 100, 'none': 0 };

    // 2. Add Self Entity first (Hallazgo 7 / Prioridad 1)
    let count = 0;
    if (selfEntityId !== undefined) {
        const self = entities.find(e => e.entityId == selfEntityId);
        if (self) {
            result.push(self);
            count++;
            currentBytes += bytesPerEntity[self.interestLevel] || 200;
        }
    }

    // 3. Add Critical (within budget)
    for (const e of critical) {
      if (e.entityId == selfEntityId) continue; // Already added
      const estimated = bytesPerEntity[e.interestLevel];
      if (currentBytes + estimated <= budget.maxBytesPerPacket && count < budget.maxEntitiesPerPacket) {
        result.push(e);
        currentBytes += estimated;
        count++;
      }
    }

    // 4. Add Medium (within budget)
    for (const e of medium) {
      if (e.entityId == selfEntityId) continue;
      const estimated = bytesPerEntity[e.interestLevel];
      if (currentBytes + estimated <= budget.maxBytesPerPacket && count < budget.maxEntitiesPerPacket) {
        result.push(e);
        currentBytes += estimated;
        count++;
      }
    }

    // 5. Add Low (Rotation / Fairness)
    if (low.length > 0) {
      let startIndex = this.lowPriorityRotation.get(clientId) ?? 0;
      if (startIndex >= low.length) startIndex = 0;

      for (let i = 0; i < low.length; i++) {
        const idx = (startIndex + i) % low.length;
        const e = low[idx];
        if (e.entityId == selfEntityId) continue;

        const estimated = bytesPerEntity[e.interestLevel];
        if (currentBytes + estimated <= budget.maxBytesPerPacket && count < budget.maxEntitiesPerPacket) {
          result.push(e);
          currentBytes += estimated;
          count++;
          // Rotation increment (only if we have more low priority entities than budget)
          if (i === budget.maxLowPriorityPerSecond - 1) {
            this.lowPriorityRotation.set(clientId, (idx + 1) % low.length);
            break;
          }
        }
      }
    }

    return result;
  }
}
