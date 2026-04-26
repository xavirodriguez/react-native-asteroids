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
        let changed = false;

        for (let j = stack.modifiers.length - 1; j >= 0; j--) {
          const mod = stack.modifiers[j];
          mod.remaining -= deltaTime;

          if (mod.remaining <= 0) {
            stack.modifiers.splice(j, 1);
            changed = true;
          }
        }

        // If all modifiers are gone, we could remove the component,
        // but often it's better to keep it if the entity is a frequent target.
        // For now, we just let it be empty.
      });
    }
  }
}
