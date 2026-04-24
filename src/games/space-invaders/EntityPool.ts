import { ComponentSetPool } from "../../engine/ComponentSetPool";
import { World } from "../../engine";
import { CollisionLayers } from "../../engine/physics2d/CollisionLayers";
import {
  Entity,
  TransformComponent,
  VelocityComponent,
  RenderComponent,
  Collider2DComponent,
  BoundaryComponent,
  TTLComponent,
  ReclaimableComponent,
  Component
} from "../../engine/EngineTypes";
import { CircleShape } from "../../engine/physics2d/ShapeTypes";
import { GAME_CONFIG } from "./types/SpaceInvadersTypes";

interface BulletComponents {
  position: TransformComponent;
  velocity: VelocityComponent;
  render: RenderComponent;
  collider: Collider2DComponent;
  boundary: BoundaryComponent;
  ttl: TTLComponent;
  reclaimable: ReclaimableComponent;
  bullet: Component;
  [key: string]: Component;
}

/**
 * Pool for player bullets.
 */
export class PlayerBulletPool {
  private pool: ComponentSetPool<BulletComponents>;

  constructor() {
    this.pool = new ComponentSetPool<BulletComponents>(
      () => ({
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
          width: GAME_CONFIG.SCREEN_WIDTH,
          height: GAME_CONFIG.SCREEN_HEIGHT,
          behavior: "destroy"
        },
        ttl: { type: "TTL", remaining: 0, total: 0 },
        reclaimable: { type: "Reclaimable", onReclaim: () => {} },
        bullet: { type: "PlayerBullet" }
      }),
      (data) => {
        data.position.x = 0;
        data.position.y = 0;
      }
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
    (data.collider.shape as CircleShape).radius = size;
    data.ttl.remaining = ttl;
    data.ttl.total = ttl;
    return entity;
  }

  release(world: World, entity: Entity): void {
    this.pool.release(world, entity);
  }
}

/**
 * Pool for enemy bullets.
 */
export class EnemyBulletPool {
  private pool: ComponentSetPool<BulletComponents>;

  constructor() {
    this.pool = new ComponentSetPool<BulletComponents>(
      () => ({
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
          width: GAME_CONFIG.SCREEN_WIDTH,
          height: GAME_CONFIG.SCREEN_HEIGHT,
          behavior: "destroy"
        },
        ttl: { type: "TTL", remaining: 0, total: 0 },
        reclaimable: { type: "Reclaimable", onReclaim: () => {} },
        bullet: { type: "EnemyBullet" }
      }),
      (data) => {
        data.position.x = 0;
        data.position.y = 0;
      }
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
    (data.collider.shape as CircleShape).radius = size;
    data.ttl.remaining = ttl;
    data.ttl.total = ttl;
    return entity;
  }

  release(world: World, entity: Entity): void {
    this.pool.release(world, entity);
  }
}

interface ParticleComponents {
  position: TransformComponent;
  velocity: VelocityComponent;
  render: RenderComponent;
  ttl: TTLComponent;
  reclaimable: ReclaimableComponent;
  [key: string]: Component;
}

/**
 * Pool for particles.
 */
export class ParticlePool {
  private pool: ComponentSetPool<ParticleComponents>;

  constructor() {
    this.pool = new ComponentSetPool<ParticleComponents>(
      () => ({
        position: { type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
        velocity: { type: "Velocity", dx: 0, dy: 0 },
        render: { type: "Render", shape: "particle", size: 0, color: "", rotation: 0 },
        ttl: { type: "TTL", remaining: 0, total: 0 },
        reclaimable: { type: "Reclaimable", onReclaim: () => {} }
      }),
      (data) => {
        data.position.x = 0;
        data.position.y = 0;
      }
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
