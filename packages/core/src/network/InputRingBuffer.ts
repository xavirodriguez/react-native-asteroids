/**
 * Circular Buffer for Input Frames.
 *
 * This structure is designed to provide efficient access to input frames by
 * tick number. It is intended for Rollback Netcode to store both local
 * inputs (for re-simulation) and remote inputs (as they arrive from the network).
 *
 * @packageDocumentation
 */

import { InputFrame } from "./NetTypes";

/**
 * A circular buffer that stores InputFrame objects indexed by simulation tick.
 *
 * @remarks
 * The buffer uses a fixed-size array to help reduce garbage collection pressure
 * in the hot path. Ticks are mapped to array indices using a bitwise AND operation.
 */
export class InputRingBuffer {
  private buffer: (InputFrame | null)[];
  private readonly capacity: number;
  private readonly mask: number;

  /**
   * @param capacity - Maximum number of frames to store. Expected to be a power of 2.
   *                   Defaults to 256.
   */
  constructor(capacity: number = 256) {
    // Ensure capacity is a power of 2
    if ((capacity & (capacity - 1)) !== 0) {
      // Find next power of 2
      let p = 1;
      while (p < capacity) p <<= 1;
      capacity = p;
      console.warn(`[InputRingBuffer] Capacity expected to be power of 2. Adjusted to ${capacity}.`);
    }

    this.capacity = capacity;
    this.mask = capacity - 1;
    this.buffer = new Array(capacity).fill(null);
  }

  /**
   * Stores an input frame at its specific tick.
   *
   * @param frame - The input frame to store.
   */
  public set(frame: InputFrame): void {
    const index = frame.tick & this.mask;
    this.buffer[index] = frame;
  }

  /**
   * Retrieves the input frame for a specific tick.
   *
   * @param tick - The simulation tick to look up.
   * @returns The InputFrame if it exists and matches the requested tick, otherwise undefined.
   */
  public get(tick: number): InputFrame | undefined {
    const index = tick & this.mask;
    const frame = this.buffer[index];

    // Ensure the frame at this index actually belongs to the requested tick
    // (handles circular wrapping validation)
    if (frame && frame.tick === tick) {
      return frame;
    }
    return undefined;
  }

  /**
   * Clears a specific tick from the buffer.
   */
  public delete(tick: number): void {
    const index = tick & this.mask;
    const frame = this.buffer[index];
    if (frame && frame.tick === tick) {
      this.buffer[index] = null;
    }
  }

  /**
   * Clears the entire buffer.
   */
  public clear(): void {
    this.buffer.fill(null);
  }

  /**
   * Returns the total capacity of the buffer.
   */
  public getCapacity(): number {
    return this.capacity;
  }
}
