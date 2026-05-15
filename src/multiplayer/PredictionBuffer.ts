/**
 * Sliding window buffer for storing predicted client states.
 *
 * This buffer is used during client-side reconciliation. When an authoritative
 * server state arrives, the client looks up the predicted state for that same tick
 * to check for divergences.
 *
 * @packageDocumentation
 */

import { PredictedState } from "./NetTypes";

/**
 * Manages historical predicted states for reconciliation.
 * Optimized with O(1) Map lookups for tick retrieval.
 */
export class PredictionBuffer {
  private buffer: PredictedState[] = [];
  private lookup = new Map<number, PredictedState>();
  private maxSize: number;

  /**
   * @param maxSize - Maximum number of ticks to retain. Defaults to 120 (approx 2 seconds at 60fps).
   */
  constructor(maxSize: number = 120) {
    this.maxSize = maxSize;
  }

  /**
   * Records a new predicted state.
   * If the buffer is full, the oldest state is discarded.
   */
  public save(state: PredictedState): void {
    // If we already have a state for this tick, replace it
    if (this.lookup.has(state.tick)) {
      const idx = this.buffer.findIndex(s => s.tick === state.tick);
      if (idx !== -1) {
        this.buffer[idx] = state;
        this.lookup.set(state.tick, state);
        return;
      }
    }

    this.buffer.push(state);
    this.lookup.set(state.tick, state);

    if (this.buffer.length > this.maxSize) {
      const oldest = this.buffer.shift();
      if (oldest) {
        this.lookup.delete(oldest.tick);
      }
    }
  }

  /**
   * Retrieves a predicted state for a specific tick.
   * @performance O(1)
   */
  public getAt(tick: number): PredictedState | undefined {
    return this.lookup.get(tick);
  }

  /**
   * Removes all states older than or equal to the specified tick.
   */
  public clearBefore(tick: number): void {
    const initialSize = this.buffer.length;
    this.buffer = this.buffer.filter((s) => {
      const keep = s.tick > tick;
      if (!keep) {
        this.lookup.delete(s.tick);
      }
      return keep;
    });
  }

  /**
   * Resets the buffer and lookup.
   */
  public clear(): void {
    this.buffer = [];
    this.lookup.clear();
  }

  /**
   * Returns the most recently saved state.
   */
  public getLast(): PredictedState | undefined {
    return this.buffer[this.buffer.length - 1];
  }
}
