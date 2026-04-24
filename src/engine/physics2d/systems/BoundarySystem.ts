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
 * @dependsOn {@link PhysicsUtils.wrapBoundary}, {@link PhysicsUtils.bounceBoundary}
 * @executionOrder Fase: Simulation. Debe ejecutarse después de MovementSystem.
 *
 * @remarks
 * Este sistema garantiza que ninguna entidad con {@link BoundaryComponent} se pierda fuera del área de
 * juego. Es esencial para proyectiles con TTL y para el movimiento cíclico en Asteroids.
 *
 * @contract Wrap: Si `x > width`, `x = 0` y viceversa. Mismo comportamiento para `y` y `height`.
 * @contract Bounce: Invierte el componente de velocidad correspondiente y mantiene la entidad en el borde.
 * @contract Destroy: Elimina la entidad invocando su pool de reciclaje si existe.
 */
export class BoundarySystem extends System {
  public update(world: World, deltaTime: number): void {
    void deltaTime;
    const entities = world.query("Transform", "Boundary");

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const pos = world.getComponent<TransformComponent>(entity, "Transform")!;
      const boundary = world.getComponent<BoundaryComponent>(entity, "Boundary")!;
      const vel = world.getComponent<VelocityComponent>(entity, "Velocity");

      if (world.hasComponent(entity, "ManualMovement")) continue;
      this.applyBoundary(world, entity, pos, boundary, vel);
    }
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
        PhysicsUtils.wrapBoundary(pos, width, height, x, y);
        break;
      case "bounce":
        if (vel) {
          PhysicsUtils.bounceBoundary(pos, vel, width, height, x, y, boundary.bounceX, boundary.bounceY);
        }
        break;
      case "destroy":
        this.destroy(world, entity);
        break;
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
