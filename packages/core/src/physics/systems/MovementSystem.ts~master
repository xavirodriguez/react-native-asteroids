import { System } from "../../index";
import { World } from "../../index";
import { TransformComponent, VelocityComponent, SpatialNodeComponent } from "../../index";
import { PhysicsUtils } from "../utils/PhysicsUtils";

/**
 * Generic system for updating entity positions based on velocity.
 */
export class MovementSystem extends System {
  public update(world: World, deltaTime: number): void {
    const query = world.getQuery("Transform" as any, "Velocity" as any);
    const dtSeconds = deltaTime / 1000;

    query.forEach((entity) => {
      const node = world.getComponent(entity, "SpatialNode" as any) as any;
      const hasBoundary = world.hasComponent(entity, "Boundary" as any);

      if (node && !node.active && !hasBoundary) {
        return;
      }

      const pos = world.getComponent(entity, "Transform" as any) as any;
      const vel = world.getComponent(entity, "Velocity" as any) as any;

      if (pos && vel) {
        if (world.hasComponent(entity, "ManualMovement" as any)) {
          return;
        }

        world.mutateComponent(entity, "Transform" as any, (p: any) => {
          PhysicsUtils.integrateMovement(p, vel, dtSeconds);
        });
      }
    });
  }
}
