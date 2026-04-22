import { RandomService } from "../RandomService";

describe("RandomService", () => {
  beforeEach(() => {
    // Reset state before each test
    RandomService.lockGameplayContext = false;
    // We can't easily reset namedInstances but we can re-seed them
    RandomService.getGameplayRandom().setSeed(12345);
    RandomService.getRenderRandom().setSeed(12345);
  });

  describe("Determinism and Ranges", () => {
    it("should be deterministic with the same seed", () => {
      const rng = new RandomService(12345);
      const sequence1 = [rng.next(), rng.next(), rng.next()];

      const rng2 = new RandomService(12345);
      const sequence2 = [rng2.next(), rng2.next(), rng2.next()];

      expect(sequence1).toEqual(sequence2);
    });

    it("should produce different sequences with different seeds", () => {
      const rng = new RandomService(12345);
      const sequence1 = [rng.next(), rng.next(), rng.next()];

      const rng2 = new RandomService(54321);
      const sequence2 = [rng2.next(), rng2.next(), rng2.next()];

      expect(sequence1).not.toEqual(sequence2);
    });

    it("should generate values within the specified range", () => {
      const rng = new RandomService(12345);
      for (let i = 0; i < 100; i++) {
        const val = rng.nextRange(10, 20);
        expect(val).toBeGreaterThanOrEqual(10);
        expect(val).toBeLessThan(20);
      }
    });

    it("should generate integers within the specified range", () => {
      const rng = new RandomService(12345);
      const values = new Set<number>();
      for (let i = 0; i < 100; i++) {
        const val = rng.nextInt(1, 4);
        expect(val).toBeGreaterThanOrEqual(1);
        expect(val).toBeLessThan(4);
        expect(Number.isInteger(val)).toBe(true);
        values.add(val);
      }
      expect(values.has(1)).toBe(true);
      expect(values.has(2)).toBe(true);
      expect(values.has(3)).toBe(true);
    });
  });

  describe("Domain Segregation", () => {
    it("should isolate gameplay and render streams", () => {
      const gameplay = RandomService.getGameplayRandom();
      const render = RandomService.getRenderRandom();

      gameplay.setSeed(12345);
      render.setSeed(12345);

      const g1 = gameplay.next();
      const r1 = render.next();

      expect(g1).toEqual(r1);

      // Consuming render should NOT affect gameplay
      render.next();
      render.next();

      const g2 = gameplay.next();
      // If they were shared, g2 would be the 4th value.
      // Since they are isolated, g2 is the 2nd value.
      const isolatedRng = new RandomService(12345);
      isolatedRng.next(); // skip 1st
      const expectedG2 = isolatedRng.next();

      expect(g2).toEqual(expectedG2);
    });
  });

  describe("Guardrails", () => {
    it("should throw when accessing 'render' during gameplay lock", () => {
      RandomService.lockGameplayContext = true;
      expect(() => RandomService.getInstance("render")).toThrow(/Deterministic violation/);
      expect(() => RandomService.getRenderRandom()).toThrow(/Deterministic violation/);
    });

    it("should throw when accessing 'global' during gameplay lock", () => {
      RandomService.lockGameplayContext = true;
      expect(() => RandomService.getInstance("global")).toThrow(/Deterministic violation/);
    });

    it("should throw when calling static methods during gameplay lock", () => {
      RandomService.lockGameplayContext = true;
      expect(() => RandomService.next()).toThrow(/Deterministic violation/);
      expect(() => RandomService.nextInt(0, 10)).toThrow(/Deterministic violation/);
      expect(() => RandomService.nextRange(0, 10)).toThrow(/Deterministic violation/);
      expect(() => RandomService.chance(0.5)).toThrow(/Deterministic violation/);
      expect(() => RandomService.nextSign()).toThrow(/Deterministic violation/);
      expect(() => RandomService.setSeed(123)).toThrow(/Deterministic violation/);
    });

    it("should ALLOW accessing 'gameplay' during gameplay lock", () => {
      RandomService.lockGameplayContext = true;
      expect(() => RandomService.getGameplayRandom()).not.toThrow();
      expect(() => RandomService.getInstance("gameplay")).not.toThrow();
    });
  });

  describe("Seed Derivation", () => {
    it("should derive render seed from gameplay seed stably", () => {
      // This tests the logic we put in BaseGame indirectly if we were to test BaseGame,
      // but here we just test that the concept works.
      const baseSeed = 12345;
      const renderSeed = baseSeed ^ 0xDEADBEEF;

      const gameplayRng = new RandomService(baseSeed);
      const renderRng = new RandomService(renderSeed);

      expect(gameplayRng.next()).not.toEqual(renderRng.next());

      // Stability
      expect(baseSeed ^ 0xDEADBEEF).toBe(12345 ^ 0xDEADBEEF);
    });
  });
});
