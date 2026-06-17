/**
 * A service for generating pseudo-random numbers.
 *
 * @remarks
 * This service uses a Linear Congruential Generator (LCG) designed to provide
 * consistent results across platforms when provided with the same seed,
 * supporting reproducible simulations.
 *
 * Note: It is not cryptographically secure and may show patterns over
 * large sequences. The generator is optimized for speed and
 * reproducibility under controlled conditions rather than high-quality randomness.
 */
export class RandomService {
  private seed: number;

  /**
   * Global flag to lock the gameplay context, intended to prevent
   * unintentional use of the gameplay RNG during non-simulation phases.
   */
  public static lockGameplayContext = false;

  constructor(seed: number = Math.random()) {
    this.seed = seed;
  }

  public setSeed(seed: number): void {
    this.seed = seed;
  }

  public getSeed(): number {
    return this.seed;
  }

  /**
   * Returns a pseudo-random number between 0 and 1.
   *
   * @remarks
   * This operation mutates the internal seed.
   */
  public next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  public range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  public rangeInt(min: number, max: number): number {
    return Math.floor(this.range(min, max));
  }

  public nextRange(min: number, max: number): number {
      return this.range(min, max);
  }

  public nextInt(min: number, max: number): number {
      return this.rangeInt(min, max);
  }
}
