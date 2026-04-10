import { System } from "../core/System";
import { World } from "../core/World";
import {
  TransformComponent,
  VelocityComponent,
  BoundaryComponent,
  Entity,
  ReclaimableComponent,
} from "../types/EngineTypes";
import { PhysicsUtils } from "../utils/PhysicsUtils";

/**
 * Sistema universal de límites que gestiona el teletransporte (wrap), rebote (bounce)
 * o destrucción de entidades cuando salen de los límites de pantalla definidos.
 *
 * @responsibility Mantener las entidades dentro del área de juego o destruirlas si salen.
 * @queries Transform, Boundary
 * @mutates Transform, Velocity, World (Entity removal)
 * @executionOrder Fase: Simulation. Debe ejecutarse después de MovementSystem.
 */
export class BoundarySystem extends System {
  public update(world: World, deltaTime: number): void {
    void deltaTime;
    const entities = world.query("Transform", "Boundary");

    entities.forEach((entity) => {
      const pos = world.getComponent<TransformComponent>(entity, "Transform")!;
      const boundary = world.getComponent<BoundaryComponent>(entity, "Boundary")!;
      const vel = world.getComponent<VelocityComponent>(entity, "Velocity");

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
    const { width, height } = boundary;
    const behavior = boundary.behavior || boundary.mode;

    const isOutOfBounds = pos.x < 0 || pos.x > width || pos.y < 0 || pos.y > height;

    if (!isOutOfBounds) return;

    switch (behavior) {
      case "wrap":
        this.wrap(pos, width, height);
        break;
      case "bounce":
        if (vel) this.bounce(pos, vel, width, height, boundary.bounceX, boundary.bounceY);
        break;
      case "destroy":
        this.destroy(world, entity);
        break;
    }
  }

  private wrap(pos: TransformComponent, width: number, height: number): void {
    PhysicsUtils.wrapBoundary(pos, width, height);
  }

  private bounce(pos: TransformComponent, vel: VelocityComponent, width: number, height: number, bounceX: boolean = true, bounceY: boolean = true): void {
    if (bounceX) {
      if (pos.x < 0) {
        pos.x = 0;
        vel.dx *= -1;
      } else if (pos.x > width) {
        pos.x = width;
        vel.dx *= -1;
      }
    }

    if (bounceY) {
      if (pos.y < 0) {
        pos.y = 0;
        vel.dy *= -1;
      } else if (pos.y > height) {
        pos.y = height;
        vel.dy *= -1;
      }
    }
  }

  private destroy(world: World, entity: Entity): void {
    const reclaimable = world.getComponent<ReclaimableComponent>(entity, "Reclaimable");
    if (reclaimable) {
      reclaimable.onReclaim(world, entity);
    }
    world.removeEntity(entity);
  }
}
