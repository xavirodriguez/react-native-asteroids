import { System } from "../core/System";
import { World } from "../core/World";
import { ModifierStackComponent, Modifier } from "../core/CoreComponents";

/**
 * System responsible for managing the lifecycle of status effects (modifiers).
 *
 * @responsibility Decrement the duration of active modifiers.
 * @responsibility Remove expired modifiers from the stack.
 * @queries ModifierStack
 * @mutates ModifierStack.active
 */
export class StatusEffectSystem extends System {
  /**
   * Updates durations and cleans up expired modifiers.
   *
   * @param world - The ECS world instance.
   * @param deltaTime - Time elapsed since last frame in milliseconds.
   */
  public update(world: World, deltaTime: number): void {
    const entities = world.query("ModifierStack");

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];

      world.mutateComponent<ModifierStackComponent>(entity, "ModifierStack", (stack) => {
        if (stack.active.length === 0) return;

        let changed = false;
        const remainingModifiers: Modifier[] = [];

        for (let j = 0; j < stack.active.length; j++) {
          const modifier = stack.active[j];
          modifier.duration -= deltaTime;

          if (modifier.duration > 0) {
            remainingModifiers.push(modifier);
          } else {
            changed = true;
          }
        }

        if (changed) {
          stack.active = remainingModifiers;
        }
      });
    }
  }
}
