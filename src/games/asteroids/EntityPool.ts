import { ObjectPool } from "../../engine/utils/ObjectPool";
import { World } from "../../engine/core/World";
import type { Entity } from "../../types/GameTypes";

// Reusable structure for a bullet - plain object, not a class
interface BulletData {
  entity: Entity;
  active: boolean;
}

/**
 * Bullet pool to reduce GC pressure.
 * Instead of creating/destroying ECS entities, it reuses slots.
 */
export class BulletPool {
  private pool: ObjectPool<BulletData>;
  private world: World;

  constructor(world: World, initialSize: number = 20) {
    this.world = world;
    this.pool = new ObjectPool<BulletData>(
      () => ({ entity: -1, active: false }),
      (data) => {
        if (data.entity !== -1 && data.active) {
          // Deactivate in the world without destroying the entity
          data.active = false;
        }
      },
      initialSize
    );
  }

  acquire(x: number, y: number, angle: number): Entity {
    void x;
    void y;
    void angle;
    // Basic implementation that just creates an entity for now
    // In a full implementation, it would reuse entities from the pool
    return this.world.createEntity();
  }

  release(entity: Entity): void {
    void entity;
    // Basic implementation: let the ECS handle destruction for now
  }
}
