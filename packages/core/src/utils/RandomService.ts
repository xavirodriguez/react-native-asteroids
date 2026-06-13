export class RandomService {
  private seed: number;
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
