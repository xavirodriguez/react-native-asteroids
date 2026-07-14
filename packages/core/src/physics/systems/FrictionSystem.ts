import { System } from "../../ecs/System";
import { World } from "../../ecs/World";
import { CoreComponentRegistry } from "../../ecs/CoreComponents";
import { SpatialCullingSystem } from "../../systems/SpatialCullingSystem";

/**
 * System that applies friction to entity velocity.
 *
 * @remarks
 * This system reduces velocity based on a friction factor and deltaTime.
 * It is intended for use with a fixed timestep to ensure consistent deceleration
 * across different frame rates.
 */
export class FrictionSystem extends System<CoreComponentRegistry> {
  update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    let entities = world.query("Velocity", "Friction");
    if (world.getResource("SpatialCullingEnabled") === true) {
      const margin = world.getResource<number>("SpatialCullingMargin") ?? 100;
      entities = SpatialCullingSystem.filterInViewport(world, [...entities], margin);
    }
    for (const entity of entities) {
      const f = world.getComponent(entity, "Friction")!;
      world.mutateComponent(entity, "Velocity", (v) => {
        const factor = Math.max(0, 1 - f.value * deltaTime);
        v.vx *= factor;
        v.vy *= factor;
        if (v.angularVelocity) {
          v.angularVelocity *= factor;
        }
      });
    }
  }
}
