import { PrefabPool } from "../../engine/utils/PrefabPool";
import { World } from "../../engine/core/World";
import {
  type Entity,
  type Component,
  type TransformComponent,
  type VelocityComponent,
  type RenderComponent,
  type ColliderComponent,
  type TTLComponent,
  type ReclaimableComponent
} from "../../engine/types/EngineTypes";

/**
 * Interface for pooled component data.
 */
interface BulletComponents {
  position: TransformComponent;
  velocity: VelocityComponent;
  render: RenderComponent;
  collider: ColliderComponent;
  ttl: TTLComponent;
  reclaimable: ReclaimableComponent;
  bullet: Component & { type: "Bullet" };
}

interface BulletParams {
  x: number; y: number; dx: number; dy: number; size: number; color: string; ttl: number;
}

/**
 * BulletPool utilizing the engine's PrefabPool.
 */
export class BulletPool extends PrefabPool<BulletComponents, BulletParams> {
  constructor(initialSize: number = 20) {
    super({
      factory: () => ({
        position: { type: "Transform", x: 0, y: 0 },
        velocity: { type: "Velocity", dx: 0, dy: 0 },
        render: { type: "Render", shape: "bullet_shape", size: 0, color: "", rotation: 0 },
        collider: { type: "Collider", radius: 0 },
        ttl: { type: "TTL", remaining: 0, total: 0 },
        reclaimable: { type: "Reclaimable", onReclaim: () => {} },
        bullet: { type: "Bullet" }
      }),
      reset: (data) => {
        data.position.x = 0; data.position.y = 0;
        data.velocity.dx = 0; data.velocity.dy = 0;
      },
      initializer: (data, p) => {
        data.position.x = p.x; data.position.y = p.y;
        data.velocity.dx = p.dx; data.velocity.dy = p.dy;
        data.render.size = p.size; data.render.color = p.color;
        data.collider.radius = p.size;
        data.ttl.remaining = p.ttl; data.ttl.total = p.ttl;
      },
      initialSize
    });
  }

  acquire(world: World, x: number, y: number, dx: number, dy: number, size: number, color: string, ttl: number): Entity {
    return super.acquire(world, { x, y, dx, dy, size, color, ttl });
  }
}

/**
 * Interface for pooled particle data.
 */
interface ParticleComponents {
  position: TransformComponent;
  velocity: VelocityComponent;
  render: RenderComponent;
  ttl: TTLComponent;
  reclaimable: ReclaimableComponent;
}

interface ParticleParams {
  x: number; y: number; dx: number; dy: number; size: number; color: string; ttl: number;
}

/**
 * ParticlePool utilizing the engine's PrefabPool.
 */
export class ParticlePool extends PrefabPool<ParticleComponents, ParticleParams> {
  constructor(initialSize: number = 100) {
    super({
      factory: () => ({
        position: { type: "Transform", x: 0, y: 0 },
        velocity: { type: "Velocity", dx: 0, dy: 0 },
        render: { type: "Render", shape: "particle", size: 0, color: "", rotation: 0 },
        ttl: { type: "TTL", remaining: 0, total: 0 },
        reclaimable: { type: "Reclaimable", onReclaim: () => {} }
      }),
      reset: (data) => {
        data.position.x = 0; data.position.y = 0;
      },
      initializer: (data, p) => {
        data.position.x = p.x; data.position.y = p.y;
        data.velocity.dx = p.dx; data.velocity.dy = p.dy;
        data.render.size = p.size; data.render.color = p.color;
        data.ttl.remaining = p.ttl; data.ttl.total = p.ttl;
      },
      initialSize
    });
  }

  acquire(world: World, x: number, y: number, dx: number, dy: number, size: number, color: string, ttl: number): Entity {
    return super.acquire(world, { x, y, dx, dy, size, color, ttl });
  }
}
