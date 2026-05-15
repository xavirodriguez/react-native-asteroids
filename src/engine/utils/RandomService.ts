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

  // LEGACY STATIC (Deprecated and potentially unsafe for multiple instances)
  private static namedInstances: Map<string, RandomService> = new Map();
  public static lockGameplayContext: boolean = false;

  public static getGameplayRandom(): RandomService {
    return this.getInstance("gameplay");
  }

  public static getRenderRandom(): RandomService {
    return this.getInstance("render");
  }

  public static getInstance(name: string = "global", initialSeed: number = 12345): RandomService {
    if (this.lockGameplayContext && (name === "render" || name === "global")) {
        throw new Error(`Deterministic violation: '${name}' random accessed during simulation.`);
    }

    let instance = this.namedInstances.get(name);
    if (!instance) {
      instance = new RandomService(initialSeed);
      this.namedInstances.set(name, instance);
    }
    return instance;
  }

  public static next(): number {
    this.checkStaticAccess("next");
    return this.getInstance("global").next();
  }

  public static nextRange(min: number, max: number): number {
    this.checkStaticAccess("nextRange");
    return this.getInstance("global").nextRange(min, max);
  }

  public static nextInt(min: number, max: number): number {
    this.checkStaticAccess("nextInt");
    return this.getInstance("global").nextInt(min, max);
  }

  public static chance(probability: number): boolean {
    this.checkStaticAccess("chance");
    return this.getInstance("global").chance(probability);
  }

  public static nextSign(): number {
    this.checkStaticAccess("nextSign");
    return this.getInstance("global").nextSign();
  }

  public static setSeed(seed: number): void {
      this.checkStaticAccess("setSeed");
      this.getInstance("global").setSeed(seed);
  }

  private static checkStaticAccess(method: string): void {
    if (this.lockGameplayContext) {
      throw new Error(`Deterministic violation: Static ${method} accessed during simulation.`);
    }
  }
}
