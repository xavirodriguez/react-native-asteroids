import { System } from "../../ecs/System";
import { World } from "../../ecs/World";
import { CoreComponentRegistry } from "../../ecs/CoreComponents";

export class BoundarySystem extends System<CoreComponentRegistry> {
  update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    const entities = world.query("Transform", "Boundary");
    for (const entity of entities) {
      const b = world.getComponent(entity, "Boundary")!;
      world.mutateComponent(entity, "Transform", (t) => {
        if (b.mode === "wrap") {
          if (t.x < 0) t.x = b.width;
          if (t.x > b.width) t.x = 0;
          if (t.y < 0) t.y = b.height;
          if (t.y > b.height) t.y = 0;
        } else if (b.mode === "destroy") {
           if (t.x < 0 || t.x > b.width || t.y < 0 || t.y > b.height) {
               world.getCommandBuffer().removeEntity(entity);
           }
        }
      });
    }
  }
}
