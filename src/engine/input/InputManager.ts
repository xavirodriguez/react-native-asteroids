import { InputController } from "./InputController";

/**
 * Centralized manager for handling multiple input sources.
 *
 * @deprecated Use UnifiedInputSystem instead for semantic action-based input.
 *
 * @remarks
 * The InputManager maintains a list of {@link InputController}s and aggregates
 * their states into a single, unified input state.
 */
export class InputManager<TInputState extends Record<string, boolean>> {
  private controllers: InputController<TInputState>[] = [];

  /**
   * Registers an input controller with the manager.
   *
   * @param controller - The {@link InputController} to add.
   */
  public addController(controller: InputController<TInputState>): void {
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
   * Clears all registered controllers without calling cleanup on them.
   * Useful when the controllers themselves are managed elsewhere.
   */
  public clearControllers(): void {
    this.controllers = [];
  }

  /**
   * Distributes manual input updates to all registered controllers.
   * Useful for touch or network-driven inputs.
   *
   * @param inputs - Partial set of input state to update.
   */
  public setInputs(inputs: Partial<TInputState>): void {
    this.controllers.forEach((c) => c.setInputs(inputs));
  }

  /**
   * Updates all registered controllers.
   * Useful for controllers that need to perceive the world or handle timing.
   */
  public update(world: any, currentTime: number, tick?: number): void {
    this.controllers.forEach((c: any) => {
      if (typeof c.update === "function") {
        c.update(world, currentTime);
      }
      if (tick !== undefined && typeof c.setTick === "function") {
        c.setTick(tick);
      }
    });
  }

  /**
   * Aggregates input states from all registered controllers.
   *
   * @returns The unified input state.
   *
   * @remarks
   * If multiple controllers provide a state for the same action,
   * the action is considered active if it is active in AT LEAST one controller.
   */
  public getCombinedInputs(): TInputState {
    return this.controllers.reduce(
      (acc, controller) => {
        const inputs = controller.getCurrentInputs();
        const combined = { ...acc };
        Object.keys(inputs).forEach(key => {
          (combined as Record<string, boolean>)[key] =
            (acc as Record<string, boolean>)[key] || (inputs as Record<string, boolean>)[key];
        });
        return combined;
      },
      {} as TInputState
    );
  }
}
