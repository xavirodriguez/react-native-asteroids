import { System } from "../core/System";
import { World } from "../core/World";
import { TTLComponent, ReclaimableComponent } from "../types/EngineTypes";

/**
 * System responsible for managing the lifetime of entities with a TTLComponent.
 */
export class TTLSystem extends System {
  public update(world: World, deltaTime: number): void {
    const ttlEntities = world.query("TTL");

    ttlEntities.forEach((entity) => {
      const ttl = world.getComponent<TTLComponent>(entity, "TTL");
      if (ttl) {
        ttl.remaining -= deltaTime;
        if (ttl.remaining <= 0) {
          // Trigger onComplete callback if present
          if (ttl.onComplete) {
            ttl.onComplete();
          }

          // Notify pool before removal if reclaimable
          const reclaimable = world.getComponent<ReclaimableComponent>(entity, "Reclaimable");
          if (reclaimable) {
            reclaimable.onReclaim(world, entity);
          }

          world.removeEntity(entity);
        }
      }
    });
  }
}
