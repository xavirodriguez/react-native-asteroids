import { RandomService } from "../RandomService";

describe("RandomService", () => {
  beforeEach(() => {
    RandomService.setSeed(12345);
  });

  it("should be deterministic with the same seed", () => {
    const sequence1 = [RandomService.next(), RandomService.next(), RandomService.next()];

    RandomService.setSeed(12345);
    const sequence2 = [RandomService.next(), RandomService.next(), RandomService.next()];

    expect(sequence1).toEqual(sequence2);
  });

  it("should produce different sequences with different seeds", () => {
    const sequence1 = [RandomService.next(), RandomService.next(), RandomService.next()];

    RandomService.setSeed(54321);
    const sequence2 = [RandomService.next(), RandomService.next(), RandomService.next()];

    expect(sequence1).not.toEqual(sequence2);
  });

  it("should generate values within the specified range", () => {
    for (let i = 0; i < 100; i++) {
      const val = RandomService.nextRange(10, 20);
      expect(val).toBeGreaterThanOrEqual(10);
      expect(val).toBeLessThan(20);
    }
  });

  it("should generate integers within the specified range", () => {
    const values = new Set<number>();
    for (let i = 0; i < 100; i++) {
      const val = RandomService.nextInt(1, 4);
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThan(4);
      expect(Number.isInteger(val)).toBe(true);
      values.add(val);
    }
    // Verify it actually hits different values
    expect(values.has(1)).toBe(true);
    expect(values.has(2)).toBe(true);
    expect(values.has(3)).toBe(true);
  });

  it("should handle probability in chance()", () => {
    RandomService.setSeed(1);
    let trueCount = 0;
    const iterations = 1000;
    for (let i = 0; i < iterations; i++) {
      if (RandomService.chance(0.5)) trueCount++;
    }
    // With 1000 iterations and 0.5 chance, we expect roughly 500
    // Deterministic seed ensures this specific result
    expect(trueCount).toBeGreaterThan(450);
    expect(trueCount).toBeLessThan(550);
  });

  it("should return random signs", () => {
    const signs = new Set<number>();
    for (let i = 0; i < 50; i++) {
      const sign = RandomService.nextSign();
      expect(Math.abs(sign)).toBe(1);
      signs.add(sign);
    }
    expect(signs.has(1)).toBe(true);
    expect(signs.has(-1)).toBe(true);
  });
});
