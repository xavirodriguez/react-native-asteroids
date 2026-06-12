import { System, World } from "../../ecs";
import { TransformComponent, VelocityComponent } from "../../ecs/CoreComponents";

export class MovementSystem extends System {
  update(world: World, deltaTime: number): void {
    const entities = world.query("Transform", "Velocity");
    for (const entity of entities) {
      world.mutateComponent<TransformComponent>(entity, "Transform", (t) => {
        const v = world.getComponent<VelocityComponent>(entity, "Velocity")!;
        t.x += v.dx * deltaTime;
        t.y += v.dy * deltaTime;
        if (v.vAngle) {
          t.rotation += v.vAngle * deltaTime;
        }
      });
    }
  }
}
