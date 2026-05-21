import { System } from "../../core/System";
import { World } from "../../core/World";
import {
  TransformComponent,
  VelocityComponent,
  BoundaryComponent,
  Entity,
  ReclaimableComponent,
} from "../../types/EngineTypes";
import { PhysicsUtils } from "../utils/PhysicsUtils";

/**
 * Sistema universal de límites que gestiona el teletransporte (wrap), rebote (bounce)
 * o destrucción de entidades cuando salen de los límites de pantalla definidos.
 *
 * @responsibility Mantener las entidades dentro del área de juego o destruirlas si salen.
 *
 * API status: Public
 */
export class BoundarySystem extends System {
  public update(world: World, deltaTime: number): void {
    void deltaTime;
    const query = world.getQuery("Transform", "Boundary");

    query.forEach((entity) => {
      const pos = world.getComponent<TransformComponent>(entity, "Transform")!;
      const boundary = world.getComponent<BoundaryComponent>(entity, "Boundary")!;
      const vel = world.getComponent<VelocityComponent>(entity, "Velocity");

      if (world.hasComponent(entity, "ManualMovement")) return;
      this.applyBoundary(world, entity, pos, boundary, vel);
    });
  }

  private applyBoundary(
    world: World,
    entity: Entity,
    pos: TransformComponent,
    boundary: BoundaryComponent,
    vel: VelocityComponent | undefined
  ): void {
    const { width, height, x = 0, y = 0 } = boundary;
    const behavior = boundary.behavior;

    const isOutOfBounds = pos.x < x || pos.x > x + width || pos.y < y || pos.y > y + height;

    if (!isOutOfBounds) return;

    switch (behavior) {
      case "wrap":
        world.mutateComponent<TransformComponent>(entity, "Transform", p => {
            PhysicsUtils.wrapBoundary(p, width, height, x, y);
        });
        break;
      case "bounce":
        if (vel) {
          world.mutateComponent<TransformComponent>(entity, "Transform", p => {
              world.mutateComponent<VelocityComponent>(entity, "Velocity", v => {
                PhysicsUtils.bounceBoundary(p, v, width, height, x, y, boundary.bounceX, boundary.bounceY);
              });
          });
        }
        break;
      case "destroy":
        this.destroy(world, entity);
        break;
    }
  }

  private destroy(world: World, entity: Entity): void {
    const reclaimable = world.getComponent<ReclaimableComponent>(entity, "Reclaimable");
    if (reclaimable && reclaimable.onReclaim) {
      reclaimable.onReclaim(world, entity);
    }
    world.getCommandBuffer().removeEntity(entity);
  }
}
