import { System, World } from "../../ecs";
import { TransformComponent, BoundaryComponent, CoreComponentRegistry } from "../../ecs/CoreComponents";

export class BoundarySystem extends System<CoreComponentRegistry> {
  update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    const entities = world.query("Transform", "Boundary");
    for (const entity of entities) {
      const b = world.getComponent(entity, "Boundary")!;
      world.mutateComponent(entity, "Transform", (t) => {
        if (b.behavior === "wrap") {
          if (t.x < (b.x || 0)) t.x = b.width;
          if (t.x > b.width) t.x = (b.x || 0);
          if (t.y < (b.y || 0)) t.y = b.height;
          if (t.y > b.height) t.y = (b.y || 0);
        }
      });
    }
  }
}
