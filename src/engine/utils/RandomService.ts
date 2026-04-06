/**
 * Seedable pseudo-random number generator.
 * Provides deterministic randomness for game logic.
 */
export class RandomService {
  private static seed: number = 12345;

  /**
   * Sets the global seed for the random number generator.
   */
  public static setSeed(newSeed: number): void {
    this.seed = newSeed;
  }

  /**
   * Generates a random float between 0 and 1.
   * Mulberry32 algorithm.
   */
  public static next(): number {
    let t = (this.seed = (this.seed + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generates a random float between min and max.
   */
  public static nextRange(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Generates a random integer between min (inclusive) and max (exclusive).
   */
  public static nextInt(min: number, max: number): number {
    return Math.floor(this.nextRange(min, max));
  }

  /**
   * Returns true or false based on a probability (0 to 1).
   */
  public static chance(probability: number): boolean {
    return this.next() < probability;
  }

  /**
   * Returns -1 or 1 randomly.
   */
  public static nextSign(): number {
    return this.next() < 0.5 ? -1 : 1;
  }
}
