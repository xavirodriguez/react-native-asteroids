import { InputController } from "./InputController";
import { PongInput } from "../types";

export interface InputFrame {
  tick: number;
  input: PongInput;
}

/**
 * Controller that injects inputs received from the network.
 * Implements a buffer to handle jitter and ensure lockstep sync.
 */
export class NetworkController extends InputController<PongInput> {
  private inputBuffer = new Map<number, PongInput>();
  private currentTick = 0;

  setup(): void {}
  cleanup(): void {
    this.inputBuffer.clear();
  }

  /**
   * Called when a new input frame arrives from the server.
   */
  public onInputReceived(frame: InputFrame): void {
    this.inputBuffer.set(frame.tick, frame.input);
  }

  /**
   * Advances the controller to a specific tick and applies the buffered input.
   */
  public setTick(tick: number): void {
    this.currentTick = tick;
    const input = this.inputBuffer.get(tick);
    if (input) {
      this.setInputs(input);
      // Optional: clear old frames from buffer
      this.inputBuffer.delete(tick - 100);
    }
  }

  /**
   * Returns whether we have the input for the required tick.
   * Essential for lockstep: we can't simulate tick N without inputs for tick N.
   */
  public hasInputForTick(tick: number): boolean {
    return this.inputBuffer.has(tick);
  }
}
