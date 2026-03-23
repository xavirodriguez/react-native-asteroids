import { type InputState } from "../../types/GameTypes";
import { InputController } from "./InputController";

/**
 * Centralized manager for handling multiple input sources.
 *
 * @remarks
 * The InputManager maintains a list of {@link InputController}s and aggregates
 * their states into a single, unified {@link InputState}.
 */
export class InputManager {
  private controllers: InputController[] = [];

  /**
   * Registers an input controller with the manager.
   *
   * @param controller - The {@link InputController} to add.
   */
  public addController(controller: InputController): void {
    controller.setup();
    this.controllers.push(controller);
  }

  /**
   * Removes all controllers and cleans up their resources.
   */
  public cleanup(): void {
    this.controllers.forEach((c) => c.cleanup());
    this.controllers = [];
  }

  /**
   * Distributes manual input updates to all registered controllers.
   * Useful for touch or network-driven inputs.
   *
   * @param inputs - Partial set of {@link InputState} to update.
   */
  public setInputs(inputs: Partial<InputState>): void {
    this.controllers.forEach((c) => c.setInputs(inputs));
  }

  /**
   * Aggregates input states from all registered controllers.
   *
   * @returns The unified {@link InputState}.
   *
   * @remarks
   * If multiple controllers provide a state for the same action,
   * the action is considered active if it is active in AT LEAST one controller.
   */
  public getCombinedInputs(): InputState {
    return this.controllers.reduce(
      (acc, controller) => {
        const inputs = controller.getCurrentInputs();
        return {
          thrust: acc.thrust || inputs.thrust,
          rotateLeft: acc.rotateLeft || inputs.rotateLeft,
          rotateRight: acc.rotateRight || inputs.rotateRight,
          shoot: acc.shoot || inputs.shoot,
          hyperspace: acc.hyperspace || inputs.hyperspace,
        };
      },
      {
        thrust: false,
        rotateLeft: false,
        rotateRight: false,
        shoot: false,
        hyperspace: false,
      } as InputState
    );
  }
}
