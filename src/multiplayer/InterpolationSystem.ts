/**
 * Visual smoothing system for remote entities.
 *
 * This module manages a buffer of historical snapshots received from the server.
 * It allows the client to calculate an interpolated visual position for an entity
 * by blending between two snapshots based on the current wall-clock time.
 *
 * @packageDocumentation
 */

import { EntitySnapshot } from "./NetTypes";

/**
 * Buffer that stores and retrieves snapshots for time-based interpolation.
 */
export class InterpolationBuffer {
  private snapshots: EntitySnapshot[] = [];
  private maxSize: number;

  /**
   * @param maxSize - Maximum number of snapshots to retain.
   */
  constructor(maxSize: number = 20) {
    this.maxSize = maxSize;
  }

  /**
   * Adds a new authoritative snapshot to the buffer.
   * Maintains the buffer sorted by timestamp to facilitate lookups.
   */
  public push(snapshot: EntitySnapshot): void {
    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSize) {
      this.snapshots.shift();
    }
    // Sort by timestamp to be safe
    this.snapshots.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Calculates interpolation data for a specific point in time.
   *
   * @param targetTime - The wall-clock time (ms) to interpolate at.
   * @returns The two surrounding snapshots and an interpolation factor [0, 1], or null if not enough data.
   *
   * @remarks
   * If `targetTime` is beyond the latest snapshot, it currently returns the latest state (clamping).
   */
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
