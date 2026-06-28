/**
 * Interface representing an input system.
 */
export interface InputSystem {
  /**
   * Manually sets an input action state.
   */
  setOverride(action: string, pressed: boolean): void;

  /**
   * Returns the state of an action.
   */
  getAction(action: string): boolean;

  /**
   * Binds raw input keys to a logical action.
   */
  bind(action: string, keys: string[]): void;
}
