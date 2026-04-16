/**
 * @packageDocumentation
 * Input synchronization for deterministic lockstep networking.
 * Buffers and organizes local and remote input frames to ensure synchronous execution.
 */

import { InputFrame } from "../../multiplayer/NetTypes";

/**
 * Manages and synchronizes input frames for deterministic lockstep networking.
 * Buffers local and remote inputs to ensure they are applied at the correct tick.
 *
 * @remarks
 * In a lockstep model, the simulation can only advance to tick `N` once all inputs for tick `N`
 * (from all players) have been received. The `InputBuffer` acts as the gathering point for
 * these inputs.
 *
 * @responsibility Buffer local player inputs per tick.
 * @responsibility Buffer remote player inputs (indexed by session ID) per tick.
 * @responsibility Verify if a tick is 'ready' to be simulated (all inputs present).
 * @responsibility Prune old frames to manage memory.
 *
 * @conceptualRisk [JITTER] If remote inputs arrive late, the local simulation must stall (pause),
 * leading to a "stuttering" experience.
 * @conceptualRisk [MEMORY_GROWTH] If `cleanUp` is not called regularly, the buffers will grow
 * indefinitely during a session.
 */
export class InputBuffer {
  /** Internal storage for the local player's input frames. */
  private localBuffer: Map<number, InputFrame> = new Map();
  /** Internal storage for remote players' input frames, grouped by session ID. */
  private remoteBuffers: Map<string, Map<number, InputFrame>> = new Map();

  /**
   * Adds a local input frame to the buffer.
   *
   * @param frame - The input frame produced by the local input system.
   * @postcondition The frame is stored and accessible via its tick number.
   */
  public addLocalInput(frame: InputFrame): void {
    this.localBuffer.set(frame.tick, frame);
  }

  /**
   * Adds a remote input frame received from the network.
   *
   * @param sessionId - The unique session identifier of the remote player.
   * @param frame - The input frame received from the server/peer.
   * @postcondition The frame is stored in the specific buffer for that session ID.
   */
  public addRemoteInput(sessionId: string, frame: InputFrame): void {
    let buffer = this.remoteBuffers.get(sessionId);
    if (!buffer) {
      buffer = new Map();
      this.remoteBuffers.set(sessionId, buffer);
    }
    buffer.set(frame.tick, frame);
  }

  /**
   * Retrieves all available inputs for a specific tick.
   *
   * @param tick - The simulation tick to query.
   * @returns A record mapping session IDs (and "local") to their respective input frames.
   *
   * @remarks
   * If a frame is missing for a session, the value for that key will be `undefined`.
   * @queries localBuffer, remoteBuffers
   */
  public getInputsForTick(tick: number): Record<string, InputFrame | undefined> {
    const inputs: Record<string, InputFrame | undefined> = {
      local: this.localBuffer.get(tick)
    };

    this.remoteBuffers.forEach((buffer, sessionId) => {
      inputs[sessionId] = buffer.get(tick);
    });

    return inputs;
  }

  /**
   * Checks if all required inputs for a specific tick are available in the buffer.
   * This is a core requirement for advancing a lockstep simulation.
   *
   * @param tick - The tick number to verify.
   * @param expectedSessionIds - List of all remote session IDs expected in this session.
   * @returns `true` if local and all expected remote inputs are present, `false` otherwise.
   */
  public isTickReady(tick: number, expectedSessionIds: string[]): boolean {
    if (!this.localBuffer.has(tick)) return false;

    for (const id of expectedSessionIds) {
      const buffer = this.remoteBuffers.get(id);
      if (!buffer || !buffer.has(tick)) return false;
    }

    return true;
  }

  /**
   * Cleans up old frames from the buffers to free memory.
   *
   * @param uptoTick - All frames with a tick number strictly less than this value will be deleted.
   *
   * @remarks
   * This should be called after a tick has been successfully simulated and confirmed
   * (e.g., after a state synchronization point).
   * @mutates localBuffer, remoteBuffers
   */
  public cleanUp(uptoTick: number): void {
    for (const tick of this.localBuffer.keys()) {
      if (tick < uptoTick) this.localBuffer.delete(tick);
    }

    this.remoteBuffers.forEach(buffer => {
      for (const tick of buffer.keys()) {
        if (tick < uptoTick) buffer.delete(tick);
      }
    });
  }
}
