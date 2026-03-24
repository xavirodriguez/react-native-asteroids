import { InputController } from "./InputController";

/**
 * Controller implementation for touch-based inputs, primarily for mobile.
 */
export class TouchController<TInputState extends Record<string, boolean>>
  extends InputController<TInputState> {

  /**
   * No specific DOM setup needed for this controller.
   */
  setup(): void {
    // No DOM setup needed for touch
  }

  /**
   * No specific cleanup needed for this controller.
   */
  cleanup(): void {
    // No cleanup needed
  }
}
