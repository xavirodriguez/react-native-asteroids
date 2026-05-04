import { World } from "../core/World";
import { System } from "../core/System";
import { InputStateComponent, InputAction } from "../types/EngineTypes";

/**
 * Unified Input System for multi-platform control handling.
 * Maps raw hardware input (keyboard, pointer, gamepad) to semantic actions.
 *
 * @responsibility Translate hardware events into abstract semantic actions.
 * @responsibility Update the singleton {@link InputStateComponent} in the {@link World}.
 * @responsibility Support manual state injection (overrides) for Networking and UI.
 *
 * @remarks
 * Decouples game logic from physical devices. It supports **Bindings**
 * (N:1 mapping from keys to actions) and **Overrides** (forced state injection).
 *
 * ### Key Features:
 * 1. **Cross-Platform**: Normalizes keyboard and touch-simulated inputs.
 * 2. **UI Overriding**: React UI buttons can simulate physical hardware presses.
 * 3. **Action-Axis Bridge**: Digital actions can be derived from analog axes.
 *
 * @public
 */
export class UnifiedInputSystem extends System {
  private bindings = new Map<InputAction, string[]>();
  private axisBindings = new Map<string, { pos: string[]; neg: string[] }>();
  private overrides = new Map<InputAction, boolean>();
  private axisOverrides = new Map<string, number>();
  private activeKeys = new Set<string>();
  private activeTouches = new Set<string>();

  private _onKeyDown = (e: KeyboardEvent) => this.activeKeys.add(e.code);
  private _onKeyUp = (e: KeyboardEvent) => this.activeKeys.delete(e.code);
  private _onPointerDown = () => this.activeTouches.add("TouchTap");
  private _onPointerUp = () => this.activeTouches.delete("TouchTap");

  constructor() {
    super();
    this.setupListeners();
  }

  /**
   * Binds a semantic action to one or more raw inputs or keys.
   *
   * @param action - Name of the semantic action (e.g., "jump").
   * @param inputs - Array of raw input identifiers (e.g., ["Space", "ArrowUp", "TouchTap"]).
   */
  public bind(action: InputAction, inputs: string[]): void {
    this.bindings.set(action, inputs);
  }

  /**
   * Binds an axis to raw inputs for positive and negative directions.
   *
   * @param axis - Name of the axis (e.g., "horizontal").
   * @param pos - Inputs triggering the positive value (+1).
   * @param neg - Inputs triggering the negative value (-1).
   */
  public bindAxis(axis: string, pos: string[], neg: string[]): void {
    this.axisBindings.set(axis, { pos, neg });
  }

  /**
   * Programmatically overrides the state of a semantic action.
   *
   * @remarks
   * Essential for mobile touch controls (calling from React components)
   * or for applying remote player inputs in multiplayer.
   *
   * @param action - Action to override.
   * @param isPressed - New pressed state.
   */
  public setOverride(action: InputAction, isPressed: boolean): void {
    this.overrides.set(action, isPressed);
  }

  /**
   * Removes an override, returning control to hardware input.
   *
   * @param action - Action to release.
   */
  public clearOverride(action: InputAction): void {
    this.overrides.delete(action);
  }

  /**
   * Programmatically overrides an analog axis value.
   *
   * @param axis - Axis name.
   * @param value - Normalized value [-1, 1].
   */
  public setAxisOverride(axis: string, value: number): void {
    this.axisOverrides.set(axis, value);
  }

  /**
   * Removes an axis override.
   */
  public clearAxisOverride(axis: string): void {
    this.axisOverrides.delete(axis);
  }

  /**
   * Registers global window listeners for hardware events.
   */
  private setupListeners(): void {
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") return;

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);

    // Simple touch/click to action mapping for demo/basic usage
    window.addEventListener("pointerdown", this._onPointerDown);
    window.addEventListener("pointerup", this._onPointerUp);
  }

  /**
   * Synchronizes active inputs with the `InputState` component.
   *
   * @remarks
   * Combines hardware states with active overrides.
   * If `InputState` doesn't exist, it is created as a singleton entity.
   *
   * @param world - Target ECS world.
   * @param _deltaTime - Elapsed time.
   *
   * @postcondition {@link InputStateComponent} singleton reflects current actions.
   * @mutates world - Creates or updates the input singleton.
   */
  public update(world: World, _deltaTime: number): void {
    let inputState = world.getSingleton<InputStateComponent>("InputState");

    if (!inputState) {
      const entity = world.createEntity();
      inputState = {
        type: "InputState",
        actions: new Map(),
        axes: new Map()
      };
      world.addComponent(entity, inputState);
    }

    // Update semantic actions based on bindings and active raw inputs
    this.bindings.forEach((inputs, action) => {
      const isRawPressed = inputs.some(input =>
        this.activeKeys.has(input) || this.activeTouches.has(input)
      );
      const isOverridden = this.overrides.get(action);
      const isPressed = isOverridden !== undefined ? (isRawPressed || isOverridden) : isRawPressed;

      inputState!.actions.set(action, isPressed);
    });

    // Ensure actions that are ONLY overridden (not bound) are also updated
    this.overrides.forEach((isPressed, action) => {
      if (!this.bindings.has(action)) {
        inputState!.actions.set(action, isPressed);
      }
    });

    // Update axes based on bindings and overrides
    this.axisBindings.forEach((config, axis) => {
      let value = 0;
      if (config.pos.some(k => this.activeKeys.has(k) || this.activeTouches.has(k))) value += 1;
      if (config.neg.some(k => this.activeKeys.has(k) || this.activeTouches.has(k))) value -= 1;

      const override = this.axisOverrides.get(axis);
      const finalValue = override !== undefined ? override : value;

      inputState!.axes.set(axis, finalValue);
    });

    // Handle axis overrides that might not have bindings
    this.axisOverrides.forEach((value, axis) => {
        if (!this.axisBindings.has(axis)) {
            inputState!.axes.set(axis, value);
        }
    });
  }

  /**
   * Removes global window listeners.
   * @remarks Call during engine destruction to prevent memory leaks.
   */
  public cleanup(): void {
    if (typeof window === "undefined" || typeof window.removeEventListener !== "function") return;

    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    window.removeEventListener("pointerdown", this._onPointerDown);
    window.removeEventListener("pointerup", this._onPointerUp);
  }

  /**
   * Captures a serializable snapshot of the current semantic input state.
   *
   * @remarks
   * Primarily used for network replication or replay recording.
   *
   * @returns List of active actions and record of analog axes.
   */
  public getInputState(): { actions: string[], axes: Record<string, number> } {
    const actionsSet = new Set<string>();
    const axes: Record<string, number> = {};

    // 1. Process hardware bindings combined with overrides (matching update() OR logic)
    this.bindings.forEach((inputs, action) => {
      const isRawPressed = inputs.some(input =>
        this.activeKeys.has(input) || this.activeTouches.has(input)
      );
      const isOverridden = this.overrides.get(action);
      const isPressed = isOverridden !== undefined ? (isRawPressed || isOverridden) : isRawPressed;

      if (isPressed) actionsSet.add(action);
    });

    // 2. Process logical overrides for actions that are NOT bound to hardware
    this.overrides.forEach((isPressed, action) => {
      if (!this.bindings.has(action) && isPressed) {
        actionsSet.add(action);
      }
    });

    const actions = Array.from(actionsSet).sort();

    // 3. Process axis bindings and overrides
    this.axisBindings.forEach((config, axis) => {
      let value = 0;
      if (config.pos.some(k => this.activeKeys.has(k) || this.activeTouches.has(k))) value += 1;
      if (config.neg.some(k => this.activeKeys.has(k) || this.activeTouches.has(k))) value -= 1;

      const override = this.axisOverrides.get(axis);
      const finalValue = override !== undefined ? override : value;

      if (finalValue !== 0) axes[axis] = finalValue;
    });

    // 4. Process axis overrides that are NOT bound
    this.axisOverrides.forEach((value, axis) => {
        if (!this.axisBindings.has(axis) && value !== 0) {
            axes[axis] = value;
        }
    });

    return { actions, axes };
  }
}
