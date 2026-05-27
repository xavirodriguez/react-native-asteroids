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
 *
 * @remarks
 * Optimized with a circular buffer for O(1) lookups. To help minimize GC pressure,
 * the buffer attempts to reuse existing state objects if the tick matches.
 * Note that initial population or tick desyncs may still result in allocations.
 */
export class PredictionBuffer {
  private buffer: (PredictedState | null)[];
  private readonly capacity: number;
  private readonly mask: number;
  private readonly requestedCapacity: number;
  private lastTick: number = -1;

  /**
   * @param capacity - Maximum number of ticks to retain. Recommended to be a power of 2.
   *                   Defaults to 128 (approx 2 seconds at 60fps).
   */
  constructor(capacity: number = 128) {
    this.requestedCapacity = capacity;

    let powerOfTwoCapacity = capacity;
    // Ensure capacity is a power of 2 for bitwise masking
    if ((powerOfTwoCapacity & (powerOfTwoCapacity - 1)) !== 0) {
      let p = 1;
      while (p < powerOfTwoCapacity) p <<= 1;
      powerOfTwoCapacity = p;
    }

    this.capacity = powerOfTwoCapacity;
    this.mask = powerOfTwoCapacity - 1;
    this.buffer = new Array(powerOfTwoCapacity).fill(null);
  }

  /**
   * Records a new predicted state.
   */
  public save(state: PredictedState): void {
    const index = state.tick & this.mask;

    // Optimized: Reuse existing object if possible to avoid allocations
    const existing = this.buffer[index];
    if (!existing || existing.tick !== state.tick) {
        this.buffer[index] = state;
    } else {
        // In-place update
        existing.entityId = state.entityId;
        existing.state.x = state.state.x;
        existing.state.y = state.state.y;
        existing.state.vx = state.state.vx;
        existing.state.vy = state.state.vy;
        existing.state.angle = state.state.angle;

        // entities is handled separately or replaced
        existing.entities = state.entities;
    }

    if (state.tick > this.lastTick) {
        this.lastTick = state.tick;
    }
  }

  /**
   * Retrieves a predicted state for a specific tick.
   * @performance O(1)
   */
  public getAt(tick: number): PredictedState | undefined {
    const index = tick & this.mask;
    const state = this.buffer[index];

    // circular wrapping validation AND age validation
    // We only return it if the tick matches AND it's within the requested capacity window
    if (state && state.tick === tick && (this.lastTick - tick) < this.requestedCapacity) {
        return state;
    }
    return undefined;
  }

  /**
   * Removes all states older than or equal to the specified tick.
   *
   * @remarks
   * In a circular buffer, we don't strictly "remove" for efficiency,
   * but we can nullify to avoid stale data if we wrap around partially.
   */
  public clearBefore(tick: number): void {
      for (let i = 0; i < this.capacity; i++) {
          const state = this.buffer[i];
          if (state && state.tick <= tick) {
              this.buffer[i] = null;
          }
      }
  }

  /**
   * Resets the buffer.
   */
  public clear(): void {
    this.buffer.fill(null);
    this.lastTick = -1;
  }

  /**
   * Returns the most recently saved state.
   */
  public getLast(): PredictedState | undefined {
    if (this.lastTick === -1) return undefined;
    return this.getAt(this.lastTick);
  }
}
