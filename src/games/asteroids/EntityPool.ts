import { World } from "../../engine/core/World";
import { CollisionLayers } from "../../engine/physics/collision/CollisionLayers";
import {
  type Component,
  type TransformComponent,
  type VelocityComponent,
  type RenderComponent,
  type Collider2DComponent,
  type TTLComponent,
  type ReclaimableComponent,
  Entity
} from "../../engine/types/EngineTypes";
import { ProjectilePool, ProjectileComponents, ProjectileParams } from "../../engine/core/ProjectilePool";

interface AsteroidBulletComponents extends ProjectileComponents {
  bullet: Component & { type: "Bullet" };
}

/**
 * Asteroids Bullet Pool refactored to use the engine's ProjectilePool base.
 */
export class BulletPool extends ProjectilePool<AsteroidBulletComponents, ProjectileParams> {
  constructor(initialSize: number = 20) {
    super({
      factory: () => ({
        position: { type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        velocity: { type: "Velocity", dx: 0, dy: 0 },
        render: { type: "Render", shape: "bullet_shape", size: 0, color: "", rotation: 0 },
        collider: {
          type: "Collider2D",
          shape: { type: "circle", radius: 0 },
          layer: CollisionLayers.PROJECTILE,
          mask: CollisionLayers.ENEMY,
          offsetX: 0, offsetY: 0, isTrigger: false, enabled: true
        },
        ttl: { type: "TTL", remaining: 0, total: 0 },
        reclaimable: { type: "Reclaimable", onReclaim: () => {} },
        bullet: { type: "Bullet" }
      }),
      reset: (data) => {
        data.position.x = 0; data.position.y = 0;
        data.velocity.dx = 0; data.velocity.dy = 0;
        data.ttl.remaining = 0;
        data.ttl.total = 0;
        data.render.rotation = 0;
      },
      initializer: (data, p) => {
        data.position.x = p.x; data.position.y = p.y;
        data.velocity.dx = p.dx; data.velocity.dy = p.dy;
        data.render.size = p.size; data.render.color = p.color;
        if (data.collider.shape.type === "circle") {
            data.collider.shape.radius = p.size;
        }
        data.ttl.remaining = p.ttl; data.ttl.total = p.ttl;
      },
      initialSize
    });
  }

  // Simplified acquire for Asteroids backward compatibility
  public acquireAsteroidBullet(world: World, x: number, y: number, dx: number, dy: number, size: number, color: string, ttl: number): Entity {
    return this.acquire(world, { x, y, dx, dy, size, color, ttl });
  }
}

/**
 * Asteroids Particle Pool refactored to use the engine's ProjectilePool base.
 */
export class ParticlePool extends ProjectilePool<ProjectileComponents, ProjectileParams> {
  constructor(initialSize: number = 100) {
    super({
      factory: () => ({
        position: { type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        velocity: { type: "Velocity", dx: 0, dy: 0 },
        render: { type: "Render", shape: "particle", size: 0, color: "", rotation: 0 },
        collider: { // Particles in asteroids have minimal collider for consistency but often disabled
            type: "Collider2D",
            shape: { type: "circle", radius: 0 },
            layer: 0, mask: 0, offsetX: 0, offsetY: 0, isTrigger: true, enabled: false
        },
        ttl: { type: "TTL", remaining: 0, total: 0 },
        reclaimable: { type: "Reclaimable", onReclaim: () => {} }
      }),
      reset: (data) => {
        data.position.x = 0; data.position.y = 0;
        data.velocity.dx = 0; data.velocity.dy = 0;
        data.ttl.remaining = 0;
        data.ttl.total = 0;
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

  public acquireAsteroidParticle(world: World, x: number, y: number, dx: number, dy: number, size: number, color: string, ttl: number): Entity {
    return this.acquire(world, { x, y, dx, dy, size, color, ttl });
  }
}
