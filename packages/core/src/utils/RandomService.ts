/**
 * PRNG Random Service - Multi-stream Seeded Randomness.
 *
 * @remarks
 * Designed to provide a seedable pseudo-random sequence intended to support
 * reproducible simulation. Reproducibility depends on all simulation components
 * using the appropriate stream exclusively and ensuring consistent seeding across participants.
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
   * Resets all static instances. Useful for tests or full engine restarts.
   */
  public static resetInstances(): void {
    // No-op for modern implementation, but kept for compatibility with legacy tests.
  }
}
