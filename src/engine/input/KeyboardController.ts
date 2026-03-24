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
export class KeyboardController<TInputState extends Record<string, boolean>>
  extends InputController<TInputState> {

  /** Set of currently pressed keyboard keys by their `code`. */
  private keys = new Set<string>();
  private keyMap: KeyMap<TInputState>;
  private defaultState: TInputState;

  constructor(keyMap: KeyMap<TInputState>, defaultState: TInputState) {
    super();
    this.keyMap = keyMap;
    this.defaultState = defaultState;
    this.inputs = { ...defaultState };
  }

  /**
   * Attaches keydown and keyup listeners to the global window object.
   */
  setup(): void {
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") return;

    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
  }

  /**
   * Removes keyboard event listeners from the global window object.
   */
  cleanup(): void {
    if (typeof window === "undefined" || typeof window.removeEventListener !== "function") return;

    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
  }

  /**
   * Internal handler for keydown events.
   */
  private handleKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.code);
    this.updateInputs();
  };

  /**
   * Internal handler for keyup events.
   */
  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
    this.updateInputs();
  };

  /**
   * Maps current key states to TInputState.
   */
  private updateInputs(): void {
    const next = { ...this.defaultState };
    this.keys.forEach(code => {
      const action = this.keyMap[code];
      if (action !== undefined) {
        (next as Record<string, boolean>)[action as string] = true;
      }
    });
    this.inputs = next;
  }
}
