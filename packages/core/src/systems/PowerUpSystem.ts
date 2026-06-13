import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry } from "../ecs/CoreComponents";

export class PowerUpSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    const entities = world.query("CollisionEvents");

    for (const entity of entities) {
      const collisionEvents = world.getComponent(entity, "CollisionEvents");
      if (!collisionEvents || !collisionEvents.lastCollision) continue;

      // In the original it was using .collisions which is not in the type.
      // Assuming lastCollision might be what's needed or just placeholder for now.
      const otherEntity = collisionEvents.lastCollision.otherEntity;
      if (otherEntity !== undefined) {
          const powerUp = world.getComponent(otherEntity, "PowerUp");
          if (powerUp) {
              this.applyPowerUp(world, entity, powerUp);
              world.getCommandBuffer().removeEntity(otherEntity);
          }
      }
    }
  }

  private applyPowerUp(_world: World<CoreComponentRegistry>, _entity: number, _powerUp: any): void {
      // Logic for power up
  }
}
