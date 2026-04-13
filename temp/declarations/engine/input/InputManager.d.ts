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
export declare class InputManager<TInputState extends Record<string, boolean>> {
    private controllers;
    /**
     * Registers an input controller with the manager.
     *
     * @param controller - The {@link InputController} to add.
     */
    addController(controller: InputController<TInputState>): void;
    /**
     * Removes all controllers and cleans up their resources.
     */
    cleanup(): void;
    /**
     * Clears all registered controllers without calling cleanup on them.
     * Useful when the controllers themselves are managed elsewhere.
     */
    clearControllers(): void;
    /**
     * Distributes manual input updates to all registered controllers.
     * Useful for touch or network-driven inputs.
     *
     * @param inputs - Partial set of input state to update.
     */
    setInputs(inputs: Partial<TInputState>): void;
    /**
     * Updates all registered controllers.
     * Useful for controllers that need to perceive the world or handle timing.
     */
    update(world: any, currentTime: number, tick?: number): void;
    /**
     * Aggregates input states from all registered controllers.
     *
     * @returns The unified input state.
     *
     * @remarks
     * If multiple controllers provide a state for the same action,
     * the action is considered active if it is active in AT LEAST one controller.
     */
    getCombinedInputs(): TInputState;
}
