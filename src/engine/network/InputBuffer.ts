import { InputFrame } from "../../multiplayer/NetTypes";

/**
 * Manages and synchronizes input frames for deterministic lockstep networking.
 * Buffers local and remote inputs to ensure they are applied at the correct tick.
 */
export class InputBuffer {
  private localBuffer: Map<number, InputFrame> = new Map();
  private remoteBuffers: Map<string, Map<number, InputFrame>> = new Map();

  /**
   * Adds a local input frame to the buffer.
   */
  public addLocalInput(frame: InputFrame): void {
    this.localBuffer.set(frame.tick, frame);
  }

  /**
   * Adds a remote input frame to the buffer.
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
   * Retrieves all inputs for a specific tick.
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
   * Checks if all inputs for a specific tick are available (lockstep requirement).
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
   * Cleans up old frames from the buffers.
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
