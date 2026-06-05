/**
 * PRNG Random Service - Multi-stream Seeded Randomness.
 */

/**
 * Service providing seeded, pseudo-random number generation intended to support
 * reproducible use cases under controlled conditions.
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
   * Generates a pseudo-random floating point number in the range [0, 1).
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
  // STATIC SUPPORT (DEPRECATED - Use World-based instances instead)
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
   * @deprecated Use `world.gameplayRandom` or `world.renderRandom` instead.
   * Internal access to static instances.
   * @internal
   */
  public static getInstance(name: string = "global", initialSeed: number = 12345): RandomService {
    if (RandomService._lockGameplayContext && name !== "gameplay") {
      throw new Error(
        `Deterministic violation: '${name}' random accessed during simulation. Only 'gameplay' stream is allowed.`
      );
    }

    let instance = RandomService.namedInstances.get(name);
    if (!instance) {
      instance = new RandomService(initialSeed);
      RandomService.namedInstances.set(name, instance);
    }
    return instance;
  }

  /**
   * @deprecated Use world.gameplayRandom
   */
  public static getGameplayRandom(): RandomService {
    return RandomService.getInstance("gameplay");
  }

  /**
   * @deprecated Use world.renderRandom
   */
  public static getRenderRandom(): RandomService {
    return RandomService.getInstance("render");
  }

  /**
   * @deprecated Static access can compromise simulation consistency in concurrent,
   * non-deterministic, or multiplayer environments.
   * @warning Static access is non-deterministic in multiplayer or multi-instance environments.
   */
  public static next(): number {
    return RandomService.getInstance("global").next();
  }

  /**
   * @deprecated Static access is non-deterministic in multiplayer environments.
   */
  public static nextRange(min: number, max: number): number {
    return RandomService.getInstance("global").nextRange(min, max);
  }

  /**
   * @deprecated Static access is non-deterministic in multiplayer environments.
   */
  public static nextInt(min: number, max: number): number {
    return RandomService.getInstance("global").nextInt(min, max);
  }

  /**
   * @deprecated Static access is non-deterministic in multiplayer environments.
   */
  public static chance(probability: number): boolean {
    return RandomService.getInstance("global").chance(probability);
  }

  /**
   * @deprecated Static access is non-deterministic in multiplayer environments.
   */
  public static nextSign(): number {
    return RandomService.getInstance("global").nextSign();
  }

  /**
   * @deprecated Static access is non-deterministic in multiplayer environments.
   */
  public static setSeed(seed: number): void {
    RandomService.getInstance("global").setSeed(seed);
  }

  /**
   * Resets all static instances. Useful for tests or full engine restarts.
   */
  public static resetInstances(): void {
    RandomService.namedInstances.clear();
    RandomService._lockGameplayContext = false;
  }
}
