import { NetworkBudgetManager } from "../NetworkBudgetManager";
import { InterestedEntity, ClientNetworkBudget } from "../types/ReplicationTypes";

describe("NetworkBudgetManager", () => {
  let manager: NetworkBudgetManager;

  beforeEach(() => {
    manager = new NetworkBudgetManager();
  });

  test("should prioritize critical over medium interest", () => {
    const entities: InterestedEntity[] = [
      { entityId: 1, interestLevel: 'medium', distance: 800 },
      { entityId: 2, interestLevel: 'critical', distance: 50 },
    ];

    const budget: ClientNetworkBudget = {
      maxBytesPerPacket: 1000,
      maxEntitiesPerPacket: 1, // Only allow 1
      maxCriticalPerTick: 10,
      maxLowPriorityPerSecond: 1
    };

    const result = manager.prioritize("c1", entities, budget);
    expect(result.length).toBe(1);
    expect(result[0].entityId).toBe(2); // Critical should win
  });

  test("should rotate low priority entities", () => {
    const entities: InterestedEntity[] = [
      { entityId: 1, interestLevel: 'low', distance: 1500 },
      { entityId: 2, interestLevel: 'low', distance: 1600 },
      { entityId: 3, interestLevel: 'low', distance: 1700 },
    ];

    const budget: ClientNetworkBudget = {
      maxBytesPerPacket: 1000,
      maxEntitiesPerPacket: 1,
      maxCriticalPerTick: 10,
      maxLowPriorityPerSecond: 1 // Only 1 low per tick
    };

    const first = manager.prioritize("c1", entities, budget);
    expect(first[0].entityId).toBe(1);

    const second = manager.prioritize("c1", entities, budget);
    expect(second[0].entityId).toBe(2);

    const third = manager.prioritize("c1", entities, budget);
    expect(third[0].entityId).toBe(3);

    const fourth = manager.prioritize("c1", entities, budget);
    expect(fourth[0].entityId).toBe(1); // Back to start
  });
});
