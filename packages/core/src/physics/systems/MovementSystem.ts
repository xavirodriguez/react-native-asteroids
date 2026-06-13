import { System } from "../../ecs/System";
import { World } from "../../ecs/World";
import { CoreComponentRegistry } from "../../ecs/CoreComponents";

/**
 * System that applies velocity to entity transforms.
 *
 * @remarks
 * This system performs basic Euler integration. While suitable for many
 * arcade-style games, it may accumulate errors over time and is sensitive
 * to frame rate variations if not used with a fixed timestep.
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
