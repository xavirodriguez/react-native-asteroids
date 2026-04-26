import { System } from "../core/System";
import { World } from "../core/World";
import { ModifierStackComponent } from "../core/CoreComponents";

/**
 * System responsible for managing the lifecycle of Status Effects (Modifiers).
 *
 * @responsibility Decrement remaining duration of all active modifiers.
 * @responsibility Remove modifiers that have expired.
 * @responsibility Clean up the ModifierStack component if it becomes empty.
 *
 * @queries ModifierStack
 * @mutates ModifierStack.modifiers
 */
export class StatusEffectSystem extends System {
  /**
   * Updates modifier durations and prunes expired ones.
   */
  public update(world: World, deltaTime: number): void {
    const entities = world.query("ModifierStack");

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];

      world.mutateComponent(entity, "ModifierStack", (stack: ModifierStackComponent) => {
        for (let j = stack.modifiers.length - 1; j >= 0; j--) {
          const mod = stack.modifiers[j];
          mod.remaining -= deltaTime;

          if (mod.remaining <= 0) {
            stack.modifiers.splice(j, 1);
          }
        }
      });
    }
  }
}
