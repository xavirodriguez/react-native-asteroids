import { System } from "../../../ecs/System";
import { World } from "../../../ecs/World";
import { CoreComponentRegistry } from "../../../ecs/CoreComponents";
import { LootTableComponent } from "../types/ArcadeTypes";

/** @public */
export class LootSystem extends System<CoreComponentRegistry & { LootTable: LootTableComponent }> {
  public update(world: World<CoreComponentRegistry & { LootTable: LootTableComponent }>, deltaTime: number): void {
    const entities = world.query("LootTable" as any, "Transform" as any);
    for (const entity of entities) {
      const loot = world.getComponent(entity, "LootTable" as any);
      // Loot logic
    }
  }
}
