import { System, World } from "../../ecs";
import { VelocityComponent, FrictionComponent, CoreComponentRegistry } from "../../ecs/CoreComponents";

export class FrictionSystem extends System<CoreComponentRegistry> {
  update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    const entities = world.query("Velocity", "Friction");
    for (const entity of entities) {
      const f = world.getComponent(entity, "Friction")!;
      world.mutateComponent(entity, "Velocity", (v) => {
        v.dx *= (1 - f.value * deltaTime);
        v.dy *= (1 - f.value * deltaTime);
        if (v.vAngle) {
          v.vAngle *= (1 - f.value * deltaTime);
        }
      });
    }
  }
}
