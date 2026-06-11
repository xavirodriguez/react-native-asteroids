/**
 * Utility for serializing and deserializing input frames with redundancy.
 *
 * In Rollback Netcode, it's common to send the current input plus several previous
 * frames in each packet. This ensures that if a packet is lost, the next one will
 * likely contain the missing data, reducing the need for re-transmissions.
 *
 * @packageDocumentation
 */

import { InputFrame } from "./NetTypes";
import { InputRingBuffer } from "./InputRingBuffer";

/**
 * Payload containing a burst of input frames for network transmission.
 */
export interface InputBurstPayload {
  /** The most recent tick included in this payload. */
  latestTick: number;
  /** Array of input frames, typically sorted by tick descending. */
  frames: InputFrame[];
  /** Session ID of the sender. */
  sessionId: string;
}

/**
 * Handles the packing and unpacking of input data for the network layer.
 */
export class InputSerializer {
  /**
   * Packs multiple historical frames from a ring buffer into a payload object.
   *
   * @remarks
   * Optimization: To minimize allocations, a `targetPayload` can be provided.
   * If provided, its `frames` array will be cleared and reused.
   *
   * @param buffer - The source InputRingBuffer.
   * @param latestTick - The newest tick to include.
   * @param count - How many previous frames to include for redundancy.
   * @param sessionId - Unique ID of the player.
   * @param targetPayload - Optional payload object to reuse.
   */
  public static pack(
    buffer: InputRingBuffer,
    latestTick: number,
    count: number,
    sessionId: string,
    targetPayload?: InputBurstPayload
  ): InputBurstPayload {
    const payload = targetPayload || {
      latestTick: 0,
      frames: [],
      sessionId: ""
    };

    payload.latestTick = latestTick;
    payload.sessionId = sessionId;

    // Reuse the existing frames array to avoid allocation
    const frames = payload.frames;
    frames.length = 0;

    // Iterate backwards from latestTick to collect 'count' frames
    for (let i = 0; i < count; i++) {
      const tick = latestTick - i;
      if (tick < 0) break;

      const frame = buffer.get(tick);
      if (frame) {
        frames.push(frame);
      }
    }

    return payload;
  }

  /**
   * Unpacks a payload and populates a target ring buffer.
   *
   * @param payload - The received burst payload.
   * @param targetBuffer - The InputRingBuffer to populate with new data.
   * @returns The number of new frames successfully stored.
   */
  public static unpack(payload: InputBurstPayload, targetBuffer: InputRingBuffer): number {
    let newFramesCount = 0;

    const frames = payload.frames;
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const existing = targetBuffer.get(frame.tick);

      if (!existing) {
        targetBuffer.set(frame);
        newFramesCount++;
      }
    }

    return newFramesCount;
  }
}
