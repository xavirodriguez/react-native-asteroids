/**
 * @packageDocumentation
 * Game session recording for replay and debugging.
 * Captures user input sequences to allow deterministic simulation playback.
 */

import { ReplayData, ReplayFrame, InputFrame } from "../../multiplayer/NetTypes";

/**
 * Game session recorder for replay and debugging purposes.
 *
 * @remarks
 * Captures user inputs frame-by-frame to enable deterministic recreation of a session.
 * This system is essential for bug reporting, performance analysis, and
 * multiplayer desync investigations.
 *
 * The recorder stores {@link InputFrame} objects indexed by their simulation tick.
 * To ensure a perfect replay, the initial world state should also be captured
 * (although this class currently focuses on the input stream).
 *
 * @responsibility Store the sequence of inputs associated with each tick.
 * @responsibility Generate a `ReplayData` object compatible with the transport system.
 *
 * @conceptualRisk [MEMORY_LEAK][HIGH] Continuous recording without limits can
 * exhaust available memory in long sessions. Consider implementing a circular buffer or periodic flush.
 * @conceptualRisk [DETERMINISM][MEDIUM] If the initial world state is not captured
 * along with the inputs, the replay will not be faithful.
 *
 * @example
 * ```ts
 * const recorder = new ReplayRecorder();
 * recorder.startRecording();
 * // In game loop:
 * recorder.recordTick(currentTick, currentInputs);
 * // To finish:
 * const replay = recorder.stopRecording();
 * ```
 */
export class ReplayRecorder {
  /** Sequential collection of recorded frames. */
  private frames: ReplayFrame[] = [];
  /** Internal flag indicating if recording is currently active. */
  private isRecording: boolean = false;
  /** Tracks the number of the last recorded tick. */
  private currentTick: number = 0;

  /**
   * Starts a new recording session.
   * Resets the internal frame buffer and tick counter.
   */
  public startRecording(): void {
    this.frames = [];
    this.isRecording = true;
    this.currentTick = 0;
  }

  /**
   * Stops the current recording and returns the aggregated replay data.
   *
   * @returns A {@link ReplayData} object with all captured frames and metadata.
   */
  public stopRecording(): ReplayData {
    this.isRecording = false;
    return {
      version: 1,
      roomId: "recorded-session",
      startTick: 0,
      endTick: this.currentTick,
      frames: [...this.frames]
    };
  }

  /**
   * Records inputs received in a specific tick.
   *
   * @param tick - The simulation tick number.
   * @param inputs - Dictionary of inputs mapped by player/entity ID.
   *
   * @precondition Recording must be active (`isRecording === true`).
   * @postcondition A new frame is added to the internal collection.
   *
   * @remarks
   * Currently only records inputs. Support for game events (e.g., entity spawning, level triggers)
   * could be added to the `events` array of the {@link ReplayFrame}.
   */
  public recordTick(tick: number, inputs: Record<string, InputFrame[]>): void {
    if (!this.isRecording) return;

    this.currentTick = tick;
    this.frames.push({
      tick,
      inputs,
      events: [] // Events could also be recorded here
    });
  }

  /**
   * Checks if the recorder is currently capturing data.
   * @queries isRecording
   */
  public isActive(): boolean {
    return this.isRecording;
  }
}
