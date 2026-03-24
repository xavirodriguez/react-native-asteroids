import { ObjectPool } from "../../engine/utils/ObjectPool";
import { World } from "../../engine/core/World";
import {
  type Entity,
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
}

/**
 * Functional BulletPool that reuses component objects.
 */
export class BulletPool {
  private componentPool: ObjectPool<BulletComponents>;

  constructor(initialSize: number = 20) {
    this.componentPool = new ObjectPool<BulletComponents>(
      () => ({
        position: { type: "Position", x: 0, y: 0 },
        velocity: { type: "Velocity", dx: 0, dy: 0 },
        render: { type: "Render", shape: "circle", size: 0, color: "", rotation: 0 },
        collider: { type: "Collider", radius: 0 },
        ttl: { type: "TTL", remaining: 0, total: 0 },
        reclaimable: {
          type: "Reclaimable",
          onReclaim: (world, entity) => this.release(world, entity)
        }
      }),
      (data) => {
        // Reset data if needed, but World.addComponent overwrites most values anyway
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
    const data = this.componentPool.acquire();
    const entity = world.createEntity();

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

    world.addComponent(entity, data.position);
    world.addComponent(entity, data.velocity);
    world.addComponent(entity, data.render);
    world.addComponent(entity, data.collider);
    world.addComponent(entity, data.ttl);
    world.addComponent(entity, data.reclaimable);
    world.addComponent(entity, { type: "Bullet" });

    return entity;
  }

  /**
   * Releases an entity's components back to the pool.
   */
  release(world: World, entity: Entity): void {
    const pos = world.getComponent<PositionComponent>(entity, "Position");
    const vel = world.getComponent<VelocityComponent>(entity, "Velocity");
    const render = world.getComponent<RenderComponent>(entity, "Render");
    const collider = world.getComponent<ColliderComponent>(entity, "Collider");
    const ttl = world.getComponent<TTLComponent>(entity, "TTL");
    const reclaimable = world.getComponent<ReclaimableComponent>(entity, "Reclaimable");

    if (pos && vel && render && collider && ttl && reclaimable) {
      this.componentPool.release({
        position: pos,
        velocity: vel,
        render: render,
        collider: collider,
        ttl: ttl,
        reclaimable: reclaimable
      });
    }
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
  private componentPool: ObjectPool<ParticleComponents>;

  constructor(initialSize: number = 100) {
    this.componentPool = new ObjectPool<ParticleComponents>(
      () => ({
        position: { type: "Position", x: 0, y: 0 },
        velocity: { type: "Velocity", dx: 0, dy: 0 },
        render: { type: "Render", shape: "particle", size: 0, color: "", rotation: 0 },
        ttl: { type: "TTL", remaining: 0, total: 0 },
        reclaimable: {
          type: "Reclaimable",
          onReclaim: (world, entity) => this.release(world, entity)
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
    const data = this.componentPool.acquire();
    const entity = world.createEntity();

    data.position.x = x;
    data.position.y = y;
    data.velocity.dx = dx;
    data.velocity.dy = dy;
    data.render.size = size;
    data.render.color = color;
    data.ttl.remaining = ttl;
    data.ttl.total = ttl;

    world.addComponent(entity, data.position);
    world.addComponent(entity, data.velocity);
    world.addComponent(entity, data.render);
    world.addComponent(entity, data.ttl);
    world.addComponent(entity, data.reclaimable);

    return entity;
  }

  release(world: World, entity: Entity): void {
    const pos = world.getComponent<PositionComponent>(entity, "Position");
    const vel = world.getComponent<VelocityComponent>(entity, "Velocity");
    const render = world.getComponent<RenderComponent>(entity, "Render");
    const ttl = world.getComponent<TTLComponent>(entity, "TTL");
    const reclaimable = world.getComponent<ReclaimableComponent>(entity, "Reclaimable");

    if (pos && vel && render && ttl && reclaimable) {
      this.componentPool.release({
        position: pos,
        velocity: vel,
        render: render,
        ttl: ttl,
        reclaimable: reclaimable
      });
    }
  }
}
