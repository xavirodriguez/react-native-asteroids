import { InputFrame } from "../../multiplayer/NetTypes";
/**
 * Manages and synchronizes input frames for deterministic lockstep networking.
 * Buffers local and remote inputs to ensure they are applied at the correct tick.
 */
export declare class InputBuffer {
    private localBuffer;
    private remoteBuffers;
    /**
     * Adds a local input frame to the buffer.
     */
    addLocalInput(frame: InputFrame): void;
    /**
     * Adds a remote input frame to the buffer.
     */
    addRemoteInput(sessionId: string, frame: InputFrame): void;
    /**
     * Retrieves all inputs for a specific tick.
     */
    getInputsForTick(tick: number): Record<string, InputFrame | undefined>;
    /**
     * Checks if all inputs for a specific tick are available (lockstep requirement).
     */
    isTickReady(tick: number, expectedSessionIds: string[]): boolean;
    /**
     * Cleans up old frames from the buffers.
     */
    cleanUp(uptoTick: number): void;
}
