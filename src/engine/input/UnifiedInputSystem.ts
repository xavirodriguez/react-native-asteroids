import { System } from "../core/System";
import { World } from "../core/World";
import { InputStateComponent, CoreComponentRegistry } from "../core/CoreComponents";
import { ComponentRegistry } from "../core/Component";
import { EventRegistry } from "../core/EventBus";

/**
 * System that maps high-level input actions to InputState.
 */
export class UnifiedInputSystem<
  TComponents extends ComponentRegistry = CoreComponentRegistry,
  TEvents extends EventRegistry = any
> extends System<TComponents, TEvents> {
  private bindings: Map<string, string[]> = new Map();
  private inputState: { actions: Set<string>, axes: Map<string, number> } = {
    actions: new Set(),
    axes: new Map()
  };

  constructor() {
    super();
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", (e) => this.handleKeyDown(e));
      window.addEventListener("keyup", (e) => this.handleKeyUp(e));
    }
  }

  public bind(action: string, keys: string[]): void {
    this.bindings.set(action, keys);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    this.bindings.forEach((keys, action) => {
      if (keys.includes(e.code)) {
        this.inputState.actions.add(action);
      }
    });
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.bindings.forEach((keys, action) => {
      if (keys.includes(e.code)) {
        this.inputState.actions.delete(action);
      }
    });
  }

  public setOverride(action: string, pressed: boolean): void {
    if (pressed) this.inputState.actions.add(action);
    else this.inputState.actions.delete(action);
  }

  public getInputState() {
    return {
      actions: Array.from(this.inputState.actions),
      axes: Object.fromEntries(this.inputState.axes)
    };
  }

  public cleanup(): void {
    // Unregister listeners
  }

  public update(world: World<TComponents, TEvents, any>, _deltaTime: number): void {
    const singleton = world.getSingleton("InputState" as any) as any as InputStateComponent;
    if (singleton) {
      world.mutateComponent(world.query("InputState" as any)[0], "InputState" as any, (s: any) => {
          const state = s as InputStateComponent;
          state.actions.clear();
          this.inputState.actions.forEach(a => state.actions.set(a, true));

          state.axes.clear();
          this.inputState.axes.forEach((val, axis) => state.axes.set(axis, val));
      });
    }
  }
}
