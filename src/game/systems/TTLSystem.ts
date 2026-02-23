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

    this.updateTTL(world, ttlEntities, deltaTime);
    const expiredEntities = this.getExpiredEntities(world, ttlEntities);

    this.removeEntities(world, expiredEntities);
  }

  private updateTTL(world: World, entities: Entity[], deltaTime: number): void {
    entities.forEach((entity) => {
      const ttl = world.getComponent<TTLComponent>(entity, "TTL")!;
      ttl.remaining -= deltaTime;
    });
  }

  private getExpiredEntities(world: World, entities: Entity[]): Entity[] {
    return entities.filter((entity) => {
      const ttl = world.getComponent<TTLComponent>(entity, "TTL")!;
      return ttl.remaining <= 0;
    });
  }

  private removeEntities(world: World, entities: Entity[]): void {
    entities.forEach((entity) => {
      world.removeEntity(entity);
    });
  }
}
