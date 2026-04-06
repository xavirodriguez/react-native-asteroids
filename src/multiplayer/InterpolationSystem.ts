import { EntitySnapshot } from "./NetTypes";

export class InterpolationBuffer {
  private snapshots: EntitySnapshot[] = [];
  private maxSize: number;

  constructor(maxSize: number = 20) {
    this.maxSize = maxSize;
  }

  public push(snapshot: EntitySnapshot): void {
    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSize) {
      this.snapshots.shift();
    }
    // Sort by timestamp to be safe
    this.snapshots.sort((a, b) => a.timestamp - b.timestamp);
  }

  public getAt(targetTime: number): { prev: EntitySnapshot; next: EntitySnapshot; alpha: number } | null {
    if (this.snapshots.length < 2) return null;

    // Find the two snapshots that bracket the target time
    for (let i = 0; i < this.snapshots.length - 1; i++) {
      const prev = this.snapshots[i];
      const next = this.snapshots[i + 1];

      if (targetTime >= prev.timestamp && targetTime <= next.timestamp) {
        const alpha = (targetTime - prev.timestamp) / (next.timestamp - prev.timestamp);
        return { prev, next, alpha };
      }
    }

    // Extrapolation (if targetTime is beyond our latest snapshot)
    const latest = this.snapshots[this.snapshots.length - 1];
    if (targetTime > latest.timestamp) {
       // Just return the latest for now, or implement extrapolation logic
       return { prev: latest, next: latest, alpha: 1 };
    }

    return null;
  }
}
