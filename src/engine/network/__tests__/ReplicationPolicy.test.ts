import { ReplicationPolicy } from "../ReplicationPolicy";

describe("ReplicationPolicy", () => {
  test("should return correct policy for known types", () => {
    const transform = ReplicationPolicy.getPolicy("Transform");
    expect(transform.importance).toBe("high");
    expect(transform.sendRate).toBe(1);

    const health = ReplicationPolicy.getPolicy("Health");
    expect(health.reliable).toBe(true);
  });

  test("should handle unknown types with defaults", () => {
    const unknown = ReplicationPolicy.getPolicy("UnknownComp");
    expect(unknown.importance).toBe("medium");
    expect(unknown.sendRate).toBe(1);
  });

  test("should indicate if replication is needed for a tick", () => {
    // Velocity has sendRate: 2
    expect(ReplicationPolicy.shouldReplicate("Velocity", 0)).toBe(true);
    expect(ReplicationPolicy.shouldReplicate("Velocity", 1)).toBe(false);
    expect(ReplicationPolicy.shouldReplicate("Velocity", 2)).toBe(true);
  });
});
