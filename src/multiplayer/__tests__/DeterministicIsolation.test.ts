import { World } from "../../engine/core/World";

describe("Deterministic Isolation", () => {
  it("should isolate RNG state between multiple Worlds", () => {
    const seed = 98765;
    const world1 = new World();
    const world2 = new World();

    world1.gameplayRandom.setSeed(seed);
    world2.gameplayRandom.setSeed(seed);

    // Initial values should be identical
    const v1_1 = world1.gameplayRandom.next();
    const v2_1 = world2.gameplayRandom.next();
    expect(v1_1).toBe(v2_1);

    // Advancing world1 should NOT advance world2
    world1.gameplayRandom.next();
    world1.gameplayRandom.next();

    const v2_2 = world2.gameplayRandom.next();
    // world2 should produce the second number in the sequence, unaffected by world1
    const worldCheck = new World();
    worldCheck.gameplayRandom.setSeed(seed);
    worldCheck.gameplayRandom.next();
    const expected = worldCheck.gameplayRandom.next();

    expect(v2_2).toBe(expected);
  });

  it("should restore RNG state from snapshots bit-perfectly", () => {
    const world = new World();
    world.gameplayRandom.setSeed(12345);

    // Advance a bit
    world.gameplayRandom.next();
    world.gameplayRandom.next();

    const snapshot = world.snapshot();
    const expectedNext = world.gameplayRandom.next();

    // Restore to snapshot
    world.restore(snapshot);
    const actualNext = world.gameplayRandom.next();

    expect(actualNext).toBe(expectedNext);
  });
});
