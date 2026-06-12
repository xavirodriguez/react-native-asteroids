import { System, World } from "../../ecs";
import { VelocityComponent, FrictionComponent } from "../../ecs/CoreComponents";

export class FrictionSystem extends System {
  update(world: World, deltaTime: number): void {
    const entities = world.query("Velocity", "Friction");
    for (const entity of entities) {
      const friction = world.getComponent<FrictionComponent>(entity, "Friction")!;
      world.mutateComponent<VelocityComponent>(entity, "Velocity", (v) => {
        const factor = 1 - friction.value * deltaTime;
        v.dx *= factor;
        v.dy *= factor;
        if (v.vAngle) {
          v.vAngle *= factor;
        }
      });
    }
  }
}
