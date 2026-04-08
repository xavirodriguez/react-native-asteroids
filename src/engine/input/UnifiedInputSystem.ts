import { World } from "../core/World";
import { System } from "../core/System";
import { InputStateComponent, InputAction } from "../types/EngineTypes";

/**
 * Unified Input System that manages keyboard and touch bindings.
 * Maps raw inputs to semantic actions in an InputStateComponent singleton.
 */
export class UnifiedInputSystem extends System {
  private bindings = new Map<InputAction, string[]>();
  private axisBindings = new Map<string, { pos: string[]; neg: string[] }>();
  private overrides = new Map<InputAction, boolean>();
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
   * Binds a semantic action to one or more raw input keys or gestures.
   * @param action Semantic action name (e.g., "jump")
   * @param inputs Array of raw input strings (e.g., ["Space", "ArrowUp", "TouchTap"])
   */
  public bind(action: InputAction, inputs: string[]): void {
    this.bindings.set(action, inputs);
  }

  /**
   * Binds an axis to raw inputs for positive and negative directions.
   */
  public bindAxis(axis: string, pos: string[], neg: string[]): void {
    this.axisBindings.set(axis, { pos, neg });
  }

  /**
   * Programmatically overrides a semantic action state.
   * This override persists until explicitly changed.
   */
  public setOverride(action: InputAction, isPressed: boolean): void {
    this.overrides.set(action, isPressed);
  }

  private setupListeners(): void {
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") return;

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);

    // Simple touch/click to action mapping for demo/basic usage
    window.addEventListener("pointerdown", this._onPointerDown);
    window.addEventListener("pointerup", this._onPointerUp);
  }

  public update(world: World, _deltaTime: number): void {
    let inputState = world.getSingleton<InputStateComponent>("InputState");

    if (!inputState) {
      const entity = world.createEntity();
      inputState = {
        type: "InputState",
        actions: new Map(),
        axes: new Map(),
        isPressed: function(action: InputAction) {
          return this.actions.get(action) || false;
        },
        getAxis: function(axis: string) {
          return this.axes.get(axis) || 0;
        }
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

    // Update axes based on bindings
    this.axisBindings.forEach((config, axis) => {
      let value = 0;
      if (config.pos.some(k => this.activeKeys.has(k))) value += 1;
      if (config.neg.some(k => this.activeKeys.has(k))) value -= 1;
      inputState!.axes.set(axis, value);
    });
  }

  /**
   * Cleans up global event listeners.
   */
  public cleanup(): void {
    if (typeof window === "undefined" || typeof window.removeEventListener !== "function") return;

    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    window.removeEventListener("pointerdown", this._onPointerDown);
    window.removeEventListener("pointerup", this._onPointerUp);
  }

  /**
   * Returns a snapshot of the current semantic input state.
   */
  public getInputState(): { actions: string[], axes: Record<string, number> } {
    const actions: string[] = [];
    const axes: Record<string, number> = {};

    this.bindings.forEach((inputs, action) => {
      const isPressed = inputs.some(input =>
        this.activeKeys.has(input) || this.activeTouches.has(input)
      );
      if (isPressed) actions.push(action);
    });

    this.axisBindings.forEach((config, axis) => {
      let value = 0;
      if (config.pos.some(k => this.activeKeys.has(k))) value += 1;
      if (config.neg.some(k => this.activeKeys.has(k))) value -= 1;
      if (value !== 0) axes[axis] = value;
    });

    return { actions, axes };
  }
}
