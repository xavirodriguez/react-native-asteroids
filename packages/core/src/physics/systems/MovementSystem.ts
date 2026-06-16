import { System } from "../../ecs/System";
import { World } from "../../ecs/World";
import { CoreComponentRegistry } from "../../ecs/CoreComponents";

/**
 * System that applies velocity to entity transforms.
 *
 * @remarks
 * This system performs basic Euler integration. It is designed for arcade-style
 * movement and is intended to be used with a fixed timestep to support
 * reproducible behavior.
 *
 * @warning
 * As this system relies on standard floating-point arithmetic, small precision
 * errors will accumulate over time. The exact movement may vary slightly across
 * different JavaScript engines or platforms.
 */
export class MovementSystem extends System<CoreComponentRegistry> {
  update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    const entities = world.query("Transform", "Velocity");
    for (const entity of entities) {
      const v = world.getComponent(entity, "Velocity")!;
      world.mutateComponent(entity, "Transform", (t) => {
        t.x += v.vx * deltaTime;
        t.y += v.vy * deltaTime;
        if (v.angularVelocity) {
          t.rotation += v.angularVelocity * deltaTime;
        }
      });
    }
  }
}
