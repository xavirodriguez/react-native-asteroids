import { World } from "../core/World";
import { System } from "../core/System";
import { InputStateComponent, InputAction } from "../types/EngineTypes";

/**
 * Unified Input System for multi-platform control handling.
 */
export class UnifiedInputSystem extends System {
  private bindings = new Map<InputAction, string[]>();
  private axisBindings = new Map<string, { pos: string[]; neg: string[] }>();
  private overrides = new Map<InputAction, boolean>();
  private axisOverrides = new Map<string, number>();
  private activeKeys = new Set<string>();
  private activeTouches = new Set<string>();
  private inputQueue: { actions: Set<string>, axes: Map<string, number> }[] = [];
  private inputDelay = 0;

  public setDelay(ticks: number): void {
    this.inputDelay = ticks;
  }

  public getDelay(): number {
    return this.inputDelay;
  }

  private _onKeyDown = (e: KeyboardEvent) => this.activeKeys.add(e.code);
  private _onKeyUp = (e: KeyboardEvent) => this.activeKeys.delete(e.code);
  private _onPointerDown = () => this.activeTouches.add("TouchTap");
  private _onPointerUp = () => this.activeTouches.delete("TouchTap");

  constructor() {
    super();
    this.setupListeners();
  }

  public bind(action: InputAction, inputs: string[]): void {
    this.bindings.set(action, inputs);
  }

  public bindAxis(axis: string, pos: string[], neg: string[]): void {
    this.axisBindings.set(axis, { pos, neg });
  }

  public setOverride(action: InputAction, isPressed: boolean): void {
    this.overrides.set(action, isPressed);
  }

  public clearOverride(action: InputAction): void {
    this.overrides.delete(action);
  }

  public setAxisOverride(axis: string, value: number): void {
    this.axisOverrides.set(axis, value);
  }

  public clearAxisOverride(axis: string): void {
    this.axisOverrides.delete(axis);
  }

  private setupListeners(): void {
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") return;
    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("pointerdown", this._onPointerDown);
    window.addEventListener("pointerup", this._onPointerUp);
  }

  public update(world: World, _deltaTime: number): void {
    const inputState = world.getSingleton<InputStateComponent>("InputState");

    if (!inputState) {
      world.getCommandBuffer().createEntity((entity) => {
        world.getCommandBuffer().addComponent(entity, {
          type: "InputState",
          actions: new Map(),
          axes: new Map()
        } as InputStateComponent);
      });
      return;
    }

    // Capture current input
    const currentActions = new Set<string>();
    const currentAxes = new Map<string, number>();

    this.bindings.forEach((inputs, action) => {
      const isRawPressed = inputs.some(input =>
        this.activeKeys.has(input) || this.activeTouches.has(input)
      );
      const isOverridden = this.overrides.get(action);
      const isPressed = isOverridden !== undefined ? (isRawPressed || isOverridden) : isRawPressed;
      if (isPressed) currentActions.add(action);
    });

    this.overrides.forEach((isPressed, action) => {
      if (!this.bindings.has(action) && isPressed) {
        currentActions.add(action);
      }
    });

    this.axisBindings.forEach((config, axis) => {
      let value = 0;
      if (config.pos.some(k => this.activeKeys.has(k) || this.activeTouches.has(k))) value += 1;
      if (config.neg.some(k => this.activeKeys.has(k) || this.activeTouches.has(k))) value -= 1;
      const override = this.axisOverrides.get(axis);
      const finalValue = override !== undefined ? override : value;
      currentAxes.set(axis, finalValue);
    });

    this.axisOverrides.forEach((value, axis) => {
      if (!this.axisBindings.has(axis)) {
        currentAxes.set(axis, value);
      }
    });

    // Enqueue
    this.inputQueue.push({ actions: currentActions, axes: currentAxes });

    // Apply delayed input
    if (this.inputQueue.length > this.inputDelay) {
      const delayed = this.inputQueue.shift()!;
      world.mutateSingleton<InputStateComponent>("InputState", state => {
        state.actions.clear();
        delayed.actions.forEach(action => state.actions.set(action, true));

        state.axes.clear();
        delayed.axes.forEach((val, axis) => state.axes.set(axis, val));
      });
    }
  }

  public cleanup(): void {
    if (typeof window === "undefined" || typeof window.removeEventListener !== "function") return;
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    window.removeEventListener("pointerdown", this._onPointerDown);
    window.removeEventListener("pointerup", this._onPointerUp);
  }

  public getInputState(): { actions: string[], axes: Record<string, number> } {
    const actionsSet = new Set<string>();
    const axes: Record<string, number> = {};

    this.bindings.forEach((inputs, action) => {
      const isRawPressed = inputs.some(input =>
        this.activeKeys.has(input) || this.activeTouches.has(input)
      );
      const isOverridden = this.overrides.get(action);
      const isPressed = isOverridden !== undefined ? (isRawPressed || isOverridden) : isRawPressed;
      if (isPressed) actionsSet.add(action);
    });

    this.overrides.forEach((isPressed, action) => {
      if (!this.bindings.has(action) && isPressed) {
        actionsSet.add(action);
      }
    });

    const actions = Array.from(actionsSet).sort();

    this.axisBindings.forEach((config, axis) => {
      let value = 0;
      if (config.pos.some(k => this.activeKeys.has(k) || this.activeTouches.has(k))) value += 1;
      if (config.neg.some(k => this.activeKeys.has(k) || this.activeTouches.has(k))) value -= 1;
      const override = this.axisOverrides.get(axis);
      const finalValue = override !== undefined ? override : value;
      if (finalValue !== 0) axes[axis] = finalValue;
    });

    this.axisOverrides.forEach((value, axis) => {
        if (!this.axisBindings.has(axis) && value !== 0) {
            axes[axis] = value;
        }
    });

    return { actions, axes };
  }
}
