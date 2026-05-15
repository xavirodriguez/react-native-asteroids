import { System } from "../core/System";
import { World } from "../core/World";
import { ModifierStackComponent } from "../core/CoreComponents";

/**
 * System that manages the duration and removal of temporary modifiers.
 * Supports both temporal and permanent modifiers.
 * 
 * @responsibility Decrement remaining duration of temporal modifiers.
 * @responsibility Remove modifiers that have expired.
 * @responsibility Emit event when modifiers expire.
 *
 * API status: Public
 */
export class ModifierSystem extends System {
  public update(world: World, deltaTime: number): void {
    const entities = world.query("ModifierStack");

    for (const entity of entities) {
      let expiredAny = false;

      world.mutateComponent(entity, "ModifierStack", (stack: ModifierStackComponent) => {
        const initialCount = stack.modifiers.length;
        
        // Decrease remaining time for each temporal modifier
        for (let i = stack.modifiers.length - 1; i >= 0; i--) {
          const mod = stack.modifiers[i];
          if (mod.remaining !== undefined) {
            mod.remaining -= deltaTime;
            if (mod.remaining <= 0) {
              stack.modifiers.splice(i, 1);
              expiredAny = true;
            }
          }
        }

        expiredAny = expiredAny || (stack.modifiers.length < initialCount);
      });

      if (expiredAny) {
        const eventBus = world.getResource<import("../core/EventBus").EventBus>("EventBus");
        if (eventBus) {
          eventBus.emitDeferred("modifiers:expired", { entity });
        }
      }
    }
  }
}
