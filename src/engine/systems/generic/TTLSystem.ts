import { System } from "../core/System";
import { World } from "../core/World";

/**
 * System responsible for managing the lifetime of entities with a TTLComponent.
 */
export class TTLSystem extends System {
  public update(world: World, deltaTime: number): void {
    const ttlEntities = world.query("TTL");

    ttlEntities.forEach((entity) => {
      const ttl = world.getComponent<{ remaining: number }>(entity, "TTL");
      if (ttl) {
        ttl.remaining -= deltaTime;
        if (ttl.remaining <= 0) {
          world.removeEntity(entity);
        }
      }
    });
  }
}
