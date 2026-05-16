/**
 * PRNG Random Service - Multi-stream Seeded Randomness.
 */

/**
 * Service providing seeded, deterministic random number generation.
 */
export class RandomService {
  private seed: number;

  constructor(seed: number = 12345) {
    this.seed = seed;
  }

  public setSeed(newSeed: number): void {
    this.seed = newSeed;
  }

  public getSeed(): number {
    return this.seed;
  }

  /**
   * Genera un número aleatorio de punto flotante en el rango [0, 1).
   */
  public next(): number {
    let t = (this.seed = (this.seed + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  public nextRange(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  public nextInt(min: number, max: number): number {
    return Math.floor(this.nextRange(min, max));
  }

  public chance(probability: number): boolean {
    return this.next() < probability;
  }

  public nextSign(): number {
    return this.next() < 0.5 ? -1 : 1;
  }

  // ==========================================================================
  // LEGACY STATIC (Deprecated - Avoid using in multi-instance environments)
  // ==========================================================================

  private static namedInstances: Map<string, RandomService> = new Map();

  /** @deprecated Access RNG via World resources instead. */
  public static getGameplayRandom(): RandomService {
    return this.getInstance("gameplay");
  }

  /** @deprecated Access RNG via World resources instead. */
  public static getRenderRandom(): RandomService {
    return this.getInstance("render");
  }

  /** @deprecated Access RNG via World resources instead. */
  public static getInstance(name: string = "global", initialSeed: number = 12345): RandomService {
    let instance = this.namedInstances.get(name);
    if (!instance) {
      instance = new RandomService(initialSeed);
      this.namedInstances.set(name, instance);
    }
    return instance;
  }

  /** @deprecated Use instance method instead. */
  public static next(): number {
    return this.getInstance("global").next();
  }

  /** @deprecated Use instance method instead. */
  public static nextRange(min: number, max: number): number {
    return this.getInstance("global").nextRange(min, max);
  }

  /** @deprecated Use instance method instead. */
  public static nextInt(min: number, max: number): number {
    return this.getInstance("global").nextInt(min, max);
  }

  /** @deprecated Use instance method instead. */
  public static chance(probability: number): boolean {
    return this.getInstance("global").chance(probability);
  }

  /** @deprecated Use instance method instead. */
  public static nextSign(): number {
    return this.getInstance("global").nextSign();
  }

  /** @deprecated Use instance method instead. */
  public static setSeed(seed: number): void {
      this.getInstance("global").setSeed(seed);
  }
}
