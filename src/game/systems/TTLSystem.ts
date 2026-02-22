import { System, type World } from "../ecs-world"
import type { TTLComponent, Entity } from "../../types/GameTypes"

/**
 * System responsible for managing the lifetime of entities with a TTLComponent.
 */
export class TTLSystem extends System {
  /**
   * Updates the remaining time for TTL entities and removes expired ones.
   */
  public update(world: World, deltaTime: number): void {
    const ttlEntities = world.query("TTL");
    const expiredEntities = this.findExpiredEntities(world, ttlEntities, deltaTime);

    this.removeEntities(world, expiredEntities);
  }

  private findExpiredEntities(world: World, entities: Entity[], deltaTime: number): Entity[] {
    return entities.filter((entity) => {
      const ttl = world.getComponent<TTLComponent>(entity, "TTL")!;
      ttl.remaining -= deltaTime;

      const isExpired = ttl.remaining <= 0;
      return isExpired;
    });
  }

  private removeEntities(world: World, entities: Entity[]): void {
    entities.forEach((entity) => {
      world.removeEntity(entity);
    });
  }
}
