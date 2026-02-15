/**
 * Represents the state of all game-related action inputs.
 */
export interface GameInputs {
  /** Whether the thrust action is currently active. */
  thrust: boolean;
  /** Whether the rotation to the left is currently active. */
  rotateLeft: boolean;
  /** Whether the rotation to the right is currently active. */
  rotateRight: boolean;
  /** Whether the shoot action is currently active. */
  shoot: boolean;
}

/**
 * Abstract base class for handling user inputs.
 *
 * @remarks
 * Input controllers decouple the source of input (keyboard, touch, gamepad) from the game logic.
 * Implementations should update the {@link inputs} property based on their specific input source.
 */
export abstract class InputController {
  /** The current state of inputs. */
  protected inputs: GameInputs = {
    thrust: false,
    rotateLeft: false,
    rotateRight: false,
    shoot: false,
  };

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
   *
   * @returns A copy of the current {@link GameInputs}.
   */
  getCurrentInputs(): Readonly<GameInputs> {
    return { ...this.inputs };
  }
}

/**
 * Controller implementation that uses browser keyboard events.
 */
export class KeyboardController extends InputController {
  /** Set of currently pressed keyboard keys by their `code`. */
  private keys = new Set<string>();
  
  /**
   * Attaches keydown and keyup listeners to the global window object.
   */
  setup(): void {
    if (typeof window === "undefined") return;
    
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
  }

  /**
   * Removes keyboard event listeners from the global window object.
   */
  cleanup(): void {
    if (typeof window === "undefined") return;
    
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
   * Maps current key states to {@link GameInputs}.
   *
   * @remarks
   * Maps:
   * - ArrowUp -> thrust
   * - ArrowLeft -> rotateLeft
   * - ArrowRight -> rotateRight
   * - Space -> shoot
   */
  private updateInputs(): void {
    this.inputs = {
      thrust: this.keys.has("ArrowUp"),
      rotateLeft: this.keys.has("ArrowLeft"),
      rotateRight: this.keys.has("ArrowRight"),
      shoot: this.keys.has("Space"),
    };
  }
}

/**
 * Controller implementation for touch-based inputs, primarily for mobile.
 */
export class TouchController extends InputController {
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

  /**
   * Manually updates the input state.
   *
   * @param inputs - Partial set of {@link GameInputs} to update.
   */
  setInputs(inputs: Partial<GameInputs>): void {
    this.inputs = { ...this.inputs, ...inputs };
  }
}
