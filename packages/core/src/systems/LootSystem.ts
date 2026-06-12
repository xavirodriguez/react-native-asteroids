import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { LootTableComponent, TransformComponent, CoreComponentRegistry } from "../ecs/CoreComponents";

export class LootSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    const entities = world.query("LootTable", "Transform");
    for (const entity of entities) {
      const loot = world.getComponent(entity, "LootTable");
      const transform = world.getComponent(entity, "Transform");
      if (loot && transform) {
          // Logic for loot
      }
    }
  }
}
