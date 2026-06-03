import { System } from "../../ecs/System";
import { World } from "../../ecs/World";
import { TransformComponent, BoundaryComponent, VelocityComponent, ReclaimableComponent } from "../../ecs/CoreComponents";
import { PhysicsUtils } from "../utils/PhysicsUtils";

/**
 * Sistema que gestiona las colisiones con los límites del mundo (Boundaries).
 *
 * @responsibility Aplicar comportamientos de wrap, bounce o destroy cuando una entidad cruza los límites.
 */
export class BoundarySystem extends System {
  /**
   * Actualiza las entidades que poseen Transform y Boundary.
   *
   * @param world - El mundo ECS.
   */
  public update(world: World, _deltaTime: number): void {
    const query = world.getQuery("Transform", "Boundary");

    query.forEach((entity) => {
      const pos = world.getComponent<TransformComponent>(entity, "Transform")!;
      const boundary = world.getComponent<BoundaryComponent>(entity, "Boundary")!;
      const vel = world.getComponent<VelocityComponent>(entity, "Velocity");

      if (world.hasComponent(entity, "ManualMovement")) return;

      const minX = boundary.x ?? 0;
      const minY = boundary.y ?? 0;
      const width = boundary.width;
      const height = boundary.height;
      const behavior = boundary.behavior;

      // Wrap Behavior
      if (behavior === "wrap") {
        world.mutateComponent<TransformComponent>(entity, "Transform", (p) => {
          PhysicsUtils.wrapBoundary(p, width, height, minX, minY);
        });
      }

      // Bounce Behavior
      else if (behavior === "bounce" && vel) {
        world.mutateComponent<TransformComponent>(entity, "Transform", (p) => {
          const v = world.getMutableComponent<VelocityComponent>(entity, "Velocity")!;
          PhysicsUtils.bounceBoundary(
            p, v, width, height, minX, minY,
            boundary.bounceX, boundary.bounceY
          );
        });
      }

      // Destroy Behavior
      else if (behavior === "destroy") {
        const maxX = minX + width;
        const maxY = minY + height;
        if (pos.x < minX || pos.x > maxX || pos.y < minY || pos.y > maxY) {
          const reclaimable = world.getComponent<ReclaimableComponent>(entity, "Reclaimable");
          if (reclaimable && (reclaimable as any).onReclaim) {
            (reclaimable as any).onReclaim(world, entity);
          } else {
            world.getCommandBuffer().removeEntity(entity);
          }
        }
      }
    });
  }
}
