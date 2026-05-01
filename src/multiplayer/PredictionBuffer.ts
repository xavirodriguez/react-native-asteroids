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
 */
export class PredictionBuffer {
  private buffer: PredictedState[] = [];
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
    this.buffer.push(state);
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }

  /**
   * Retrieves a predicted state for a specific tick.
   */
  public getAt(tick: number): PredictedState | undefined {
    return this.buffer.find((s) => s.tick === tick);
  }

  public clearBefore(tick: number): void {
    this.buffer = this.buffer.filter((s) => s.tick > tick);
  }

  public clear(): void {
    this.buffer = [];
  }

  public getLast(): PredictedState | undefined {
    return this.buffer[this.buffer.length - 1];
  }
}
