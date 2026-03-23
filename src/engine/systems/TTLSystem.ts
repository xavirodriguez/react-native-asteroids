import { System } from "../core/System";
import { World } from "../core/World";

/**
 * Interface for systems that need to release entities to a pool.
 */
export interface PooledSystem {
  onEntityExpired(world: World, entity: number): void;
}

/**
 * System responsible for managing the lifetime of entities with a TTLComponent.
 */
export class TTLSystem extends System {
  constructor(private poolHandler?: PooledSystem) {
    super();
  }

  public update(world: World, deltaTime: number): void {
    const ttlEntities = world.query("TTL");

    ttlEntities.forEach((entity) => {
      const ttl = world.getComponent<{ remaining: number }>(entity, "TTL");
      if (ttl) {
        ttl.remaining -= deltaTime;
        if (ttl.remaining <= 0) {
          if (this.poolHandler) {
            this.poolHandler.onEntityExpired(world, entity);
          } else {
            world.removeEntity(entity);
          }
        }
      }
    });
  }
}
