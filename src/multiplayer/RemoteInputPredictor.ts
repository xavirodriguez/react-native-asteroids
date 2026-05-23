/**
 * Remote Input Prediction Engine.
 *
 * In Rollback Netcode, when the input for a remote player has not arrived for the current tick,
 * the engine must "guess" what the player is doing to continue the simulation.
 *
 * @packageDocumentation
 */

import { InputFrame } from "./NetTypes";
import { InputRingBuffer } from "./InputRingBuffer";

/**
 * Strategy for predicting remote player inputs.
 */
export class RemoteInputPredictor {
  /**
   * Predicts the input frame for a specific tick based on historical data.
   *
   * @remarks
   * Optimization: To minimize allocations, a `targetFrame` can be provided.
   * If provided, its properties will be overwritten instead of creating a new object.
   *
   * @param buffer - The remote player's InputRingBuffer.
   * @param targetTick - The tick we need to predict.
   * @param targetFrame - Optional InputFrame object to reuse.
   * @returns The InputFrame with predicted data.
   */
  public static predictNext(
    buffer: InputRingBuffer,
    targetTick: number,
    targetFrame?: InputFrame
  ): InputFrame {
    // Look back for the most recent confirmed frame
    let lastKnownFrame: InputFrame | undefined;

    // Search back up to 60 frames (1 second)
    for (let i = 1; i <= 60; i++) {
      const frame = buffer.get(targetTick - i);
      if (frame) {
        lastKnownFrame = frame;
        break;
      }
    }

    const result = targetFrame || {
      protocolVersion: 1,
      tick: targetTick,
      timestamp: Date.now(),
      actions: [],
      axes: {}
    };

    if (lastKnownFrame) {
      result.protocolVersion = lastKnownFrame.protocolVersion;
      result.tick = targetTick;
      result.timestamp = Date.now();

      // Deep copy actions array to avoid reference issues if the source is mutated,
      // but reuse the existing array if possible.
      if (!result.actions) result.actions = [];
      result.actions.length = 0;
      for (let i = 0; i < lastKnownFrame.actions.length; i++) {
        result.actions.push(lastKnownFrame.actions[i]);
      }

      // Sync axes
      if (!result.axes) result.axes = {};
      // Clear old axes without creating a new object
      for (const key in result.axes) {
        delete result.axes[key];
      }
      for (const key in lastKnownFrame.axes) {
        result.axes[key] = lastKnownFrame.axes[key];
      }
    } else {
      // Neutral fallback
      result.tick = targetTick;
      result.timestamp = Date.now();
      if (result.actions) result.actions.length = 0;
      if (result.axes) {
          for (const key in result.axes) delete result.axes[key];
      }
    }

    return result;
  }

  /**
   * Identifies if an input frame in the buffer is real or predicted.
   *
   * @remarks
   * For a robust implementation, InputFrame could include an `isPredicted` flag.
   */
  public static isLikelyPredicted(buffer: InputRingBuffer, tick: number): boolean {
    const current = buffer.get(tick);
    const previous = buffer.get(tick - 1);

    if (!current || !previous) return false;

    // Fast heuristic comparison
    if (current.actions.length !== previous.actions.length) return false;
    for (let i = 0; i < current.actions.length; i++) {
      if (current.actions[i] !== previous.actions[i]) return false;
    }

    return true;
  }
}
