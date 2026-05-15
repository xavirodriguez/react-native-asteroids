import { System } from "../core/System";
import { World } from "../core/World";

/**
 * @deprecated Use ModifierSystem instead. 
 * This system is now a no-op to prevent double-decrement of durations.
 */
export class StatusEffectSystem extends System {
  public update(_world: World, _deltaTime: number): void {
    // No-op. Logic moved to ModifierSystem.
  }
}
