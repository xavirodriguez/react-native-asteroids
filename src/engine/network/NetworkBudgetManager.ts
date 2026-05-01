import { InterestedEntity, ClientNetworkBudget } from "./types/ReplicationTypes";

/**
 * @responsibility Prioritize and filter entities to stay within a network budget.
 */
export class NetworkBudgetManager {
  private lowPriorityRotation = new Map<string, number>(); // clientId -> startIndex

  public static readonly DEFAULT_BUDGET: ClientNetworkBudget = {
    maxBytesPerPacket: 8192, // 8KB
    maxEntitiesPerPacket: 50,
    maxCriticalPerTick: 20,
    maxLowPriorityPerSecond: 5, // Approx. 5 every 60 ticks
  };

  /**
   * Filters and prioritizes entities based on the client's budget.
   */
  public prioritize(
    clientId: string,
    entities: InterestedEntity[],
    budget: ClientNetworkBudget = NetworkBudgetManager.DEFAULT_BUDGET
  ): InterestedEntity[] {
    const result: InterestedEntity[] = [];

    // 1. Sort by importance level
    const importanceOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3, 'none': 4 };
    const sorted = [...entities].sort((a, b) => {
      if (a.interestLevel !== b.interestLevel) {
        return importanceOrder[a.interestLevel] - importanceOrder[b.interestLevel];
      }
      return a.distance - b.distance;
    });

    const critical = sorted.filter(e => e.interestLevel === 'critical');
    const high = sorted.filter(e => e.interestLevel === 'high');
    const medium = sorted.filter(e => e.interestLevel === 'medium');
    const low = sorted.filter(e => e.interestLevel === 'low');

    // 2. Add Critical (within budget)
    let count = 0;
    for (const e of critical) {
      if (count < budget.maxCriticalPerTick && count < budget.maxEntitiesPerPacket) {
        result.push(e);
        count++;
      }
    }

    // 3. Add High
    for (const e of high) {
      if (count < budget.maxEntitiesPerPacket) {
        result.push(e);
        count++;
      }
    }

    // 4. Add Medium
    for (const e of medium) {
      if (count < budget.maxEntitiesPerPacket) {
        result.push(e);
        count++;
      }
    }

    // 5. Add Low (rotating)
    if (count < budget.maxEntitiesPerPacket && low.length > 0) {
      const startIndex = this.lowPriorityRotation.get(clientId) ?? 0;
      const amountToAdd = Math.min(budget.maxLowPriorityPerSecond, budget.maxEntitiesPerPacket - count, low.length);

      for (let i = 0; i < amountToAdd; i++) {
        const index = (startIndex + i) % low.length;
        result.push(low[index]);
        count++;
      }

      this.lowPriorityRotation.set(clientId, (startIndex + amountToAdd) % low.length);
    }

    return result;
  }
}
