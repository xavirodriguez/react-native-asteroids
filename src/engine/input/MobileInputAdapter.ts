import { UnifiedInputSystem } from "./UnifiedInputSystem";
import type { InputAction } from "../core/CoreComponents";

/**
 * Adapts mobile gesture events to UnifiedInputSystem overrides.
 * This is the ONLY class that knows about both the gesture layer and the ECS input system.
 * Game logic never touches this class directly.
 */
export class MobileInputAdapter {
  private readonly input: UnifiedInputSystem;

  // Track active overrides so reset() can clean them all up
  private activeActionOverrides = new Set<InputAction>();
  private activeAxisOverrides = new Set<string>();

  constructor(input: UnifiedInputSystem) {
    this.input = input;
  }

  // ── Axes ──────────────────────────────────────────────────────────────────

  setMoveAxis(x: number, y: number): void {
    this.input.setAxisOverride("horizontal", x);
    this.input.setAxisOverride("vertical", y);
    this.activeAxisOverrides.add("horizontal");
    this.activeAxisOverrides.add("vertical");
  }

  // ── Discrete actions ──────────────────────────────────────────────────────

  setThrust(active: boolean): void {
    this._setAction("thrust", active);
  }

  setShoot(active: boolean): void {
    this._setAction("shoot", active);
  }

  setRotateLeft(active: boolean): void {
    this._setAction("rotateLeft", active);
  }

  setRotateRight(active: boolean): void {
    this._setAction("rotateRight", active);
  }

  setHyperspace(active: boolean): void {
    this._setAction("hyperspace", active);
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /** Call on component unmount to avoid stuck inputs. */
  reset(): void {
    this.activeActionOverrides.forEach(a => this.input.clearOverride(a));
    this.activeAxisOverrides.forEach(a => this.input.clearAxisOverride(a));
    this.activeActionOverrides.clear();
    this.activeAxisOverrides.clear();
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _setAction(action: InputAction, active: boolean): void {
    this.input.setOverride(action, active);
    this.activeActionOverrides.add(action);
  }
}
