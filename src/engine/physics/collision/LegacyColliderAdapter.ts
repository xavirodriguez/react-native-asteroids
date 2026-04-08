import { System } from "../../core/System";
import { World } from "../../core/World";
import { ColliderComponent, Collider2DComponent } from "../../types/EngineTypes";
import { ShapeFactory } from "../shapes/ShapeFactory";

export class LegacyColliderAdapter extends System {
  update(world: World, _deltaTime: number): void {
    const legacyEntities = world.query("Collider");
    legacyEntities.forEach(entity => {
      const legacy = world.getComponent<ColliderComponent>(entity, "Collider")!;
      let modern = world.getComponent<Collider2DComponent>(entity, "Collider2D");
      if (!modern) {
        modern = {
          type: "Collider2D",
          shape: ShapeFactory.circle(legacy.radius),
          offsetX: 0,
          offsetY: 0,
          isTrigger: false,
          layer: 1,
          mask: 0xFFFFFFFF,
          enabled: true
        };
        world.addComponent(entity, modern);
      } else if (modern.shape.type === "circle") {
        modern.shape.radius = legacy.radius;
      }
    });
  }
}
