import { InputController } from "./InputController";
/**
 * Mapping between keyboard event codes and input actions.
 */
export interface KeyMap<TInputState extends Record<string, boolean>> {
    [keyCode: string]: keyof TInputState;
}
/**
 * Controller implementation that uses browser keyboard events.
 */
export declare class KeyboardController<TInputState extends Record<string, boolean>> extends InputController<TInputState> {
    /** Set of currently pressed keyboard keys by their `code`. */
    private keys;
    private keyMap;
    private defaultState;
    constructor(keyMap: KeyMap<TInputState>, defaultState: TInputState);
    /**
     * Attaches keydown and keyup listeners to the global window object.
     */
    setup(): void;
    /**
     * Removes keyboard event listeners from the global window object.
     */
    cleanup(): void;
    /**
     * Internal handler for keydown events.
     */
    private handleKeyDown;
    /**
     * Internal handler for keyup events.
     */
    private handleKeyUp;
    /**
     * Maps current key states to TInputState.
     */
    private updateInputs;
}
