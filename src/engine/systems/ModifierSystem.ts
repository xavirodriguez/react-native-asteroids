import { System } from "../core/System";
import { World } from "../core/World";
import { ModifierStackComponent } from "../core/CoreComponents";

/**
 * System that manages the duration and removal of temporary modifiers.
 */
export class ModifierSystem extends System {
  public update(world: World, deltaTime: number): void {
    const entities = world.query("ModifierStack");

    for (const entity of entities) {
      world.mutateComponent(entity, "ModifierStack", (stack: ModifierStackComponent) => {
        // Decrease remaining time for each modifier
        for (const mod of stack.modifiers) {
          if (mod.remaining !== undefined) {
            mod.remaining -= deltaTime;
          }
        }

        // Filter out expired modifiers
        const initialCount = stack.modifiers.length;
        stack.modifiers = stack.modifiers.filter(mod => mod.remaining === undefined || mod.remaining > 0);

        if (stack.modifiers.length < initialCount) {
            // Something expired
            const eventBus = world.getResource<import("../core/EventBus").EventBus>("EventBus");
            if (eventBus) eventBus.emit("modifiers:expired", { entity });
        }
      });
    }
  }
}
