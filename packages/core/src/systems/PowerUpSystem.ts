import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { PowerUpComponent, CollisionEventsComponent, CoreComponentRegistry } from "../ecs/CoreComponents";

export class PowerUpSystem extends System<any> {
  public update(world: World<any>, _deltaTime: number): void {
    const query = world.getQuery("CollisionEvents");

    query.forEach((entity) => {
      const collisionEvents = world.getComponent(entity, "CollisionEvents");
      if (!collisionEvents) return;

      for (const col of (collisionEvents as any).collisions) {
          const powerUp = world.getComponent(col.otherEntity, "PowerUp");
          if (powerUp) {
              this.applyPowerUp(world, entity, powerUp as any);
              world.getCommandBuffer().removeEntity(col.otherEntity);
          }
      }
    });
  }

  private applyPowerUp(_world: World<any>, _entity: number, _powerUp: any): void {
      // Logic for power up
  }
}
