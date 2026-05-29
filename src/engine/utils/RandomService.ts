/**
 * PRNG Random Service - Multi-stream Seeded Randomness.
 */

/**
 * Service providing seeded, pseudo-random number generation designed for use
 * in cases where reproducibility is desired.
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
   * Genera un número pseudo-aleatorio de punto flotante en el rango [0, 1).
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
  // STATIC SUPPORT (Restricted to internal use and tests)
  // ==========================================================================

  private static namedInstances: Map<string, RandomService> = new Map();
  /** @internal */
  private static _lockGameplayContext: boolean = false;

  /** @internal */
  public static get lockGameplayContext(): boolean {
    return this._lockGameplayContext;
  }

  /** @internal */
  public static set lockGameplayContext(value: boolean) {
    this._lockGameplayContext = value;
  }

  /**
   * Internal access to static instances.
   * @internal
   */
  public static getInstance(name: string = "global", initialSeed: number = 12345): RandomService {
    if (this._lockGameplayContext && name !== "gameplay") {
        throw new Error(`Deterministic violation: '${name}' random accessed during simulation. Only 'gameplay' stream is allowed.`);
    }

    let instance = this.namedInstances.get(name);
    if (!instance) {
      instance = new RandomService(initialSeed);
      this.namedInstances.set(name, instance);
    }
    return instance;
  }

  /**
   * @deprecated Use world.gameplayRandom
   */
  public static getGameplayRandom(): RandomService {
    return this.getInstance("gameplay");
  }

  /**
   * @deprecated Use world.renderRandom
   */
  public static getRenderRandom(): RandomService {
    return this.getInstance("render");
  }

  /**
   * Resets all static instances. Useful for tests or full engine restarts.
   */
  public static resetInstances(): void {
    this.namedInstances.clear();
    this._lockGameplayContext = false;
  }
}
