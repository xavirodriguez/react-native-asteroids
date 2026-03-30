/**
 * Deterministic random number generator using the Mulberry32 algorithm.
 */
export class RandomService {
  private state: number;

  constructor(seed: number = Date.now()) {
    this.state = seed;
  }

  /**
   * Generates a random float between 0 and 1.
   */
  public nextFloat(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) | 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generates a random integer between min (inclusive) and max (exclusive).
   */
  public nextInt(min: number, max: number): number {
    return Math.floor(this.nextFloat() * (max - min)) + min;
  }

  /**
   * Generates a random boolean.
   */
  public nextBoolean(probability: number = 0.5): boolean {
    return this.nextFloat() < probability;
  }

  /**
   * Returns a random element from an array.
   */
  public nextElement<T>(array: T[]): T {
    return array[this.nextInt(0, array.length)];
  }

  /**
   * Sets the seed for the generator.
   */
  public setSeed(seed: number): void {
    this.state = seed;
  }
}

// Export a singleton for global use if needed, but better to instantiate in systems
export const randomService = new RandomService();
