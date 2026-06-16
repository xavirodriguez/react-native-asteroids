import { System, World, CoreComponentRegistry } from "@tiny-aster/core";
import { LootTableComponent } from "../types/ArcadeTypes";

export class LootSystem extends System<CoreComponentRegistry & { LootTable: LootTableComponent }> {
  public update(world: World<CoreComponentRegistry & { LootTable: LootTableComponent }>, deltaTime: number): void {
    const entities = world.query("LootTable" as any, "Transform" as any);
    for (const entity of entities) {
      const loot = world.getComponent(entity, "LootTable" as any);
      // Loot logic
    }
  }
}
