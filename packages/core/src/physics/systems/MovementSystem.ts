import { System, World } from "../../ecs";
import { TransformComponent, VelocityComponent, CoreComponentRegistry } from "../../ecs/CoreComponents";

export class MovementSystem extends System<CoreComponentRegistry> {
  update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    const entities = world.query("Transform", "Velocity");
    for (const entity of entities) {
      world.mutateComponent(entity, "Transform", (t) => {
        const v = world.getComponent(entity, "Velocity")!;
        t.x += v.dx * deltaTime;
        t.y += v.dy * deltaTime;
        if (v.vAngle) {
          t.rotation += v.vAngle * deltaTime;
        }
      });
    }
  }
}
