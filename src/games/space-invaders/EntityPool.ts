import { World } from "../../engine/core/World";
import { CollisionLayers } from "../../engine/physics/collision/CollisionLayers";
import {
  Entity,
  Component,
  BoundaryComponent
} from "../../engine/types/EngineTypes";
import { SpaceInvadersConfig } from "./types/SpaceInvadersConfigSchema";
import { ProjectilePool, ProjectileComponents, ProjectileParams } from "../../engine/core/ProjectilePool";

interface InvaderBulletComponents extends ProjectileComponents {
  boundary: BoundaryComponent;
  bullet: Component;
}

/**
 * Standardized Player Bullet Pool for Space Invaders.
 */
export class PlayerBulletPool extends ProjectilePool<InvaderBulletComponents, ProjectileParams> {
  constructor() {
    super({
      factory: () => ({
        position: { type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        velocity: { type: "Velocity", dx: 0, dy: 0 },
        render: { type: "Render", shape: "player_bullet", size: 0, color: "", rotation: 0 },
        collider: {
          type: "Collider2D",
          shape: { type: "circle", radius: 0 },
          layer: CollisionLayers.PROJECTILE,
          mask: CollisionLayers.ENEMY | CollisionLayers.DEBRIS,
          offsetX: 0, offsetY: 0, isTrigger: false, enabled: true
        },
        boundary: {
          type: "Boundary",
          width: 800,
          height: 600,
          behavior: "destroy"
        },
        ttl: { type: "TTL", remaining: 0, total: 0 },
        reclaimable: { type: "Reclaimable", onReclaim: () => {} },
        bullet: { type: "PlayerBullet" }
      }),
      reset: (data) => {
        data.position.x = 0;
        data.position.y = 0;
      },
      initializer: (data, p, world) => {
        const config = world.getResource<SpaceInvadersConfig>("GameConfig");
        data.position.x = p.x;
        data.position.y = p.y;
        data.velocity.dx = p.dx;
        data.velocity.dy = p.dy;
        data.render.size = p.size;
        data.render.color = p.color;
        if (data.collider.shape.type === "circle") {
            data.collider.shape.radius = p.size;
        }
        if (config) {
            data.boundary.width = config.SCREEN_WIDTH;
            data.boundary.height = config.SCREEN_HEIGHT;
        }
        data.ttl.remaining = p.ttl;
        data.ttl.total = p.ttl;
      }
    });
  }

  public acquireInvaderBullet(world: World, x: number, y: number, dx: number, dy: number, size: number, color: string, ttl: number): Entity {
    return this.acquire(world, { x, y, dx, dy, size, color, ttl });
  }
}

/**
 * Standardized Enemy Bullet Pool for Space Invaders.
 */
export class EnemyBulletPool extends ProjectilePool<InvaderBulletComponents, ProjectileParams> {
  constructor() {
    super({
      factory: () => ({
        position: { type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        velocity: { type: "Velocity", dx: 0, dy: 0 },
        render: { type: "Render", shape: "enemy_bullet", size: 0, color: "", rotation: 0 },
        collider: {
          type: "Collider2D",
          shape: { type: "circle", radius: 0 },
          layer: CollisionLayers.ENEMY,
          mask: CollisionLayers.PLAYER,
          offsetX: 0, offsetY: 0, isTrigger: false, enabled: true
        },
        boundary: {
          type: "Boundary",
          width: 800,
          height: 600,
          behavior: "destroy"
        },
        ttl: { type: "TTL", remaining: 0, total: 0 },
        reclaimable: { type: "Reclaimable", onReclaim: () => {} },
        bullet: { type: "EnemyBullet" }
      }),
      reset: (data) => {
        data.position.x = 0;
        data.position.y = 0;
      },
      initializer: (data, p, world) => {
        const config = world.getResource<SpaceInvadersConfig>("GameConfig");
        data.position.x = p.x;
        data.position.y = p.y;
        data.velocity.dx = p.dx;
        data.velocity.dy = p.dy;
        data.render.size = p.size;
        data.render.color = p.color;
        if (data.collider.shape.type === "circle") {
            data.collider.shape.radius = p.size;
        }
        if (config) {
            data.boundary.width = config.SCREEN_WIDTH;
            data.boundary.height = config.SCREEN_HEIGHT;
        }
        data.ttl.remaining = p.ttl;
        data.ttl.total = p.ttl;
      }
    });
  }

  public acquireInvaderBullet(world: World, x: number, y: number, dx: number, dy: number, size: number, color: string, ttl: number): Entity {
    return this.acquire(world, { x, y, dx, dy, size, color, ttl });
  }
}

/**
 * Standardized Particle Pool for Space Invaders.
 */
export class ParticlePool extends ProjectilePool<ProjectileComponents, ProjectileParams> {
  constructor() {
    super({
      factory: () => ({
        position: { type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        velocity: { type: "Velocity", dx: 0, dy: 0 },
        render: { type: "Render", shape: "particle", size: 0, color: "", rotation: 0 },
        collider: {
            type: "Collider2D",
            shape: { type: "circle", radius: 0 },
            layer: 0, mask: 0, offsetX: 0, offsetY: 0, isTrigger: true, enabled: false
        },
        ttl: { type: "TTL", remaining: 0, total: 0 },
        reclaimable: { type: "Reclaimable", onReclaim: () => {} }
      }),
      reset: (data) => {
        data.position.x = 0;
        data.position.y = 0;
      },
      initializer: (data, p) => {
        data.position.x = p.x;
        data.position.y = p.y;
        data.velocity.dx = p.dx;
        data.velocity.dy = p.dy;
        data.render.size = p.size;
        data.render.color = p.color;
        data.ttl.remaining = p.ttl;
        data.ttl.total = p.ttl;
      }
    });
  }
}
