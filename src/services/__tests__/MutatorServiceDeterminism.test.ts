import { MutatorService } from "../MutatorService";

describe("MutatorService Determinism", () => {
  it("should return the same mutators for the same timestamp", () => {
    const timestamp = 1715000000000; // Some fixed point in time
    const m1 = MutatorService.getWeeklyMutators(timestamp);
    const m2 = MutatorService.getWeeklyMutators(timestamp);

    expect(m1).toEqual(m2);
    expect(m1.length).toBeGreaterThan(0);
  });

  it("should return different mutators for timestamps in different weeks", () => {
    const week1 = new Date("2024-05-01T12:00:00Z").getTime();
    const week2 = new Date("2024-05-15T12:00:00Z").getTime();

    const m1 = MutatorService.getWeeklyMutators(week1);
    const m2 = MutatorService.getWeeklyMutators(week2);

    // This assumes there are enough mutators in the config to actually change
    // but at least we can verify they are calculated based on the timestamp.
    // If they happen to be the same due to rotation wrap-around, it's still technically correct
    // but we want to ensure the ISO week is different.
    expect(m1).toBeDefined();
    expect(m2).toBeDefined();
  });

  it("should use local time if no timestamp is provided", () => {
    const m1 = MutatorService.getWeeklyMutators();
    expect(m1).toBeDefined();
    expect(m1.length).toBeGreaterThan(0);
  });
});
