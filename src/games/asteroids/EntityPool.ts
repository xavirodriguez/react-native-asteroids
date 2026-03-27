import { EntityPool } from "../../engine/utils/EntityPool";
import { World } from "../../engine/core/World";
import {
  type Entity,
  type Component,
  type PositionComponent,
  type VelocityComponent,
  type RenderComponent,
  type ColliderComponent,
  type TTLComponent,
  type ReclaimableComponent
} from "../../engine/types/EngineTypes";

/**
 * Interface for pooled component data to minimize garbage collection.
 */
interface BulletComponents {
  position: PositionComponent;
  velocity: VelocityComponent;
  render: RenderComponent;
  collider: ColliderComponent;
  ttl: TTLComponent;
  reclaimable: ReclaimableComponent;
  bullet: Component & { type: "Bullet" };
}

/**
 * Functional BulletPool that reuses component objects.
 */
export class BulletPool {
  private pool: EntityPool<BulletComponents>;

  constructor(initialSize: number = 20) {
    this.pool = new EntityPool<BulletComponents>(
      () => ({
        position: { type: "Position", x: 0, y: 0 },
        velocity: { type: "Velocity", dx: 0, dy: 0 },
        render: { type: "Render", shape: "bullet_shape", size: 0, color: "", rotation: 0 },
        collider: { type: "Collider", radius: 0 },
        ttl: { type: "TTL", remaining: 0, total: 0 },
        reclaimable: {
          type: "Reclaimable",
          onReclaim: () => {} // Overwritten by EntityPool
        },
        bullet: { type: "Bullet" }
      }),
      (data) => {
        data.position.x = 0;
        data.position.y = 0;
        data.velocity.dx = 0;
        data.velocity.dy = 0;
      },
      initialSize
    );
  }

  /**
   * Acquires a bullet from the pool, initializing it in the world.
   */
  acquire(world: World, x: number, y: number, dx: number, dy: number, size: number, color: string, ttl: number): Entity {
    const { entity, components: data } = this.pool.acquire(world);

    data.position.x = x;
    data.position.y = y;
    data.velocity.dx = dx;
    data.velocity.dy = dy;
    data.render.size = size;
    data.render.color = color;
    data.render.rotation = 0;
    data.collider.radius = size;
    data.ttl.remaining = ttl;
    data.ttl.total = ttl;

    return entity;
  }

  /**
   * Releases an entity's components back to the pool.
   */
  release(world: World, entity: Entity): void {
    this.pool.release(world, entity);
  }
}

/**
 * Interface for pooled particle data.
 */
interface ParticleComponents {
  position: PositionComponent;
  velocity: VelocityComponent;
  render: RenderComponent;
  ttl: TTLComponent;
  reclaimable: ReclaimableComponent;
}

/**
 * Functional ParticlePool that reuses component objects.
 */
export class ParticlePool {
  private pool: EntityPool<ParticleComponents>;

  constructor(initialSize: number = 100) {
    this.pool = new EntityPool<ParticleComponents>(
      () => ({
        position: { type: "Position", x: 0, y: 0 },
        velocity: { type: "Velocity", dx: 0, dy: 0 },
        render: { type: "Render", shape: "particle", size: 0, color: "", rotation: 0 },
        ttl: { type: "TTL", remaining: 0, total: 0 },
        reclaimable: {
          type: "Reclaimable",
          onReclaim: () => {} // Overwritten by EntityPool
        }
      }),
      (data) => {
        data.position.x = 0;
        data.position.y = 0;
      },
      initialSize
    );
  }

  acquire(world: World, x: number, y: number, dx: number, dy: number, size: number, color: string, ttl: number): Entity {
    const { entity, components: data } = this.pool.acquire(world);

    data.position.x = x;
    data.position.y = y;
    data.velocity.dx = dx;
    data.velocity.dy = dy;
    data.render.size = size;
    data.render.color = color;
    data.ttl.remaining = ttl;
    data.ttl.total = ttl;

    return entity;
  }

  release(world: World, entity: Entity): void {
    this.pool.release(world, entity);
  }
}
