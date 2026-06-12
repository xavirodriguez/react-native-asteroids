import { System, World } from "../../ecs";
import { TransformComponent, BoundaryComponent, VelocityComponent } from "../../ecs/CoreComponents";

export class BoundarySystem extends System {
  update(world: World, deltaTime: number): void {
    const entities = world.query("Transform", "Boundary");
    for (const entity of entities) {
      const boundary = world.getComponent<BoundaryComponent>(entity, "Boundary")!;
      world.mutateComponent<TransformComponent>(entity, "Transform", (t) => {
        if (boundary.behavior === "wrap") {
          if (t.x < 0) t.x = boundary.width;
          else if (t.x > boundary.width) t.x = 0;
          if (t.y < 0) t.y = boundary.height;
          else if (t.y > boundary.height) t.y = 0;
        } else if (boundary.behavior === "destroy") {
          if (t.x < 0 || t.x > boundary.width || t.y < 0 || t.y > boundary.height) {
            world.getCommandBuffer().removeEntity(entity);
          }
        } else if (boundary.behavior === "bounce") {
           // Basic bounce
           let bounced = false;
           if (t.x < 0) { t.x = 0; bounced = true; }
           else if (t.x > boundary.width) { t.x = boundary.width; bounced = true; }
           if (t.y < 0) { t.y = 0; bounced = true; }
           else if (t.y > boundary.height) { t.y = boundary.height; bounced = true; }

           if (bounced) {
             world.mutateComponent<VelocityComponent>(entity, "Velocity", v => {
                if (t.x <= 0 || t.x >= boundary.width) v.dx *= -1;
                if (t.y <= 0 || t.y >= boundary.height) v.dy *= -1;
             });
           }
        }
      });
    }
  }
}
