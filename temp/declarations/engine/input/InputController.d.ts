/**
 * Abstract base class for handling user inputs.
 *
 * @remarks
 * Input controllers decouple the source of input (keyboard, touch, gamepad) from the game logic.
 * TInputState is a Record of boolean flags representing different input actions.
 */
export declare abstract class InputController<TInputState extends Record<string, boolean> = {
    [key: string]: boolean;
}> {
    /** The current state of inputs. */
    protected inputs: TInputState;
    /**
     * Sets up any necessary listeners or initialization for the input source.
     */
    abstract setup(): void;
    /**
     * Cleans up any resources or listeners when the controller is no longer needed.
     */
    abstract cleanup(): void;
    /**
     * Returns a read-only snapshot of the current input state.
     */
    getCurrentInputs(): Readonly<TInputState>;
    /**
     * Manually updates the input state.
     */
    setInputs(inputs: Partial<TInputState>): void;
}
