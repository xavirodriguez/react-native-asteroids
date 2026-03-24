import { World } from "../../../engine/core/World";
import { CollisionSystem } from "../../../engine/systems/CollisionSystem";
import {
  type PositionComponent,
  type AsteroidComponent,
  type HealthComponent,
  type Entity,
  type ComponentType,
  GAME_CONFIG,
  RenderComponent,
  ReclaimableComponent,
} from "../../../types/GameTypes";

import { createAsteroid, createParticle } from "../EntityFactory";
import { getGameState } from "../GameUtils";
import { hapticDamage, hapticDeath } from "../../../utils/haptics";
import { ParticlePool } from "../EntityPool";

const ASTEROID_SPLIT_CONFIG: Record<
  AsteroidComponent["size"],
  { nextSize: "medium" | "small"; offset: number } | undefined
> = {
  large: { nextSize: "medium", offset: GAME_CONFIG.ASTEROID_SPLIT_OFFSET_LARGE },
  medium: { nextSize: "small", offset: GAME_CONFIG.ASTEROID_SPLIT_OFFSET_MEDIUM },
  small: undefined,
};

/**
 * System responsible for detecting and resolving collisions between entities.
 */
export class AsteroidCollisionSystem extends CollisionSystem {
  constructor(private particlePool: ParticlePool) {
    super();
  }

  /**
   * Called when a collision is detected.
   */
  protected onCollision(world: World, entityA: Entity, entityB: Entity): void {
    this.resolveCollision({ world, entityA, entityB });
  }

  private resolveCollision(collisionPair: { world: World; entityA: Entity; entityB: Entity }): void {
    const { world, entityA, entityB } = collisionPair;
    const pair = { entityA, entityB };

    if (this.handleBulletAsteroidPair({ world, pair })) return;
    if (this.handleShipAsteroidPair({ world, pair })) return;
    if (this.handleBulletUfoPair({ world, pair })) return;
    this.handleShipUfoPair({ world, pair });
  }

  private handleBulletUfoPair(context: {
    world: World;
    pair: { entityA: Entity; entityB: Entity };
  }): boolean {
    const { world, pair } = context;
    const match = this.matchPair({ world, pair, type1: "Bullet", type2: "Ufo" });

    if (match) {
      const matchUfo = (match as any).Ufo as Entity;
      const matchBullet = (match as any).Bullet as Entity;
      const pos = world.getComponent<PositionComponent>(matchUfo, "Position");
      if (pos) {
        this.spawnExplosionParticles(world, pos, GAME_CONFIG.PARTICLE_COUNT * 2);
      }
      this.destroyEntity(world, matchUfo);
      this.destroyEntity(world, matchBullet);
      this.addScore({ world, points: 100 });
      return true;
    }
    return false;
  }

  private handleShipUfoPair(context: {
    world: World;
    pair: { entityA: Entity; entityB: Entity };
  }): boolean {
    const { world, pair } = context;
    const match = this.matchPair({ world, pair, type1: "Ship", type2: "Ufo" });

    if (match) {
      const matchShip = (match as any).Ship as Entity;
      const matchUfo = (match as any).Ufo as Entity;
      const health = world.getComponent<HealthComponent>(matchShip, "Health");
      if (this.canShipTakeDamage(health)) {
        this.applyDamageToShip(world, health);
        const pos = world.getComponent<PositionComponent>(matchUfo, "Position");
        if (pos) {
          this.spawnExplosionParticles(world, pos, GAME_CONFIG.PARTICLE_COUNT * 2);
        }
        this.destroyEntity(world, matchUfo);
      }
      return true;
    }
    return false;
  }

  private handleBulletAsteroidPair(context: {
    world: World;
    pair: { entityA: Entity; entityB: Entity };
  }): boolean {
    const { world, pair } = context;
    const match = this.matchPair({ world, pair, type1: "Bullet", type2: "Asteroid" });

    if (match) {
      const matchAsteroid = (match as any).Asteroid as Entity;
      const matchBullet = (match as any).Bullet as Entity;
      this.handleBulletAsteroidCollision({
        world,
        asteroid: matchAsteroid,
        bullet: matchBullet,
      });
      return true;
    }
    return false;
  }

  private handleShipAsteroidPair(context: {
    world: World;
    pair: { entityA: Entity; entityB: Entity };
  }): boolean {
    const { world, pair } = context;
    const match = this.matchPair({ world, pair, type1: "Ship", type2: "Asteroid" });

    if (match) {
      const matchShip = (match as any).Ship as Entity;
      this.handleShipAsteroidCollision({ world, shipEntity: matchShip });
      return true;
    }
    return false;
  }

  private matchPair<T1 extends ComponentType, T2 extends ComponentType>(config: {
    world: World;
    pair: { entityA: Entity; entityB: Entity };
    type1: T1;
    type2: T2;
  }): Record<T1 | T2, Entity> | undefined {
    const { world, pair, type1, type2 } = config;
    const { entityA, entityB } = pair;

    if (world.hasComponent(entityA, type1) && world.hasComponent(entityB, type2)) {
      return { [type1]: entityA, [type2]: entityB } as Record<T1 | T2, Entity>;
    }
    if (world.hasComponent(entityB, type1) && world.hasComponent(entityA, type2)) {
      return { [type1]: entityB, [type2]: entityA } as Record<T1 | T2, Entity>;
    }
    return undefined;
  }

  private handleBulletAsteroidCollision(context: {
    world: World;
    asteroid: Entity;
    bullet: Entity;
  }): void {
    const { world, asteroid, bullet } = context;
    const pos = world.getComponent<PositionComponent>(asteroid, "Position");
    const render = world.getComponent<RenderComponent>(asteroid, "Render");
    if (pos) {
      this.spawnExplosionParticles(world, pos, GAME_CONFIG.PARTICLE_COUNT);
    }
    // Improvement 9: Hit flash effect
    if (render) {
      render.hitFlashFrames = 8;
    }
    this.splitAsteroid({ world, asteroidEntity: asteroid });
    this.destroyEntity(world, bullet);
    this.addScore({ world, points: GAME_CONFIG.ASTEROID_SCORE });
  }

  private spawnExplosionParticles(world: World, pos: PositionComponent, count: number): void {
    for (let i = 0; i < count; i++) {
      createParticle({
        world,
        x: pos.x,
        y: pos.y,
        dx: (Math.random() - 0.5) * 160, // [-80, 80]
        dy: (Math.random() - 0.5) * 160, // [-80, 80]
        color: i % 2 === 0 ? "#FF8800" : "#FFDD00",
        ttl: GAME_CONFIG.PARTICLE_TTL_BASE,
        pool: this.particlePool,
      });
    }
  }

  private handleShipAsteroidCollision(context: { world: World; shipEntity: Entity }): void {
    const { world, shipEntity } = context;
    const health = world.getComponent<HealthComponent>(shipEntity, "Health");

    if (this.canShipTakeDamage(health)) {
      this.applyDamageToShip(world, health);
    }
  }

  private canShipTakeDamage(health: HealthComponent | undefined): health is HealthComponent {
    return !!health && health.invulnerableRemaining <= 0;
  }

  private applyDamageToShip(world: World, health: HealthComponent): void {
    health.current--;
    health.invulnerableRemaining = GAME_CONFIG.INVULNERABILITY_DURATION;

    const gameState = getGameState(world);
    gameState.screenShake = {
      intensity: GAME_CONFIG.SHAKE_INTENSITY_IMPACT,
      duration: GAME_CONFIG.SHAKE_DURATION_IMPACT,
    };

    if (health.current <= 0) {
      hapticDeath();
    } else {
      hapticDamage();
    }
  }

  private splitAsteroid(asteroidContext: { world: World; asteroidEntity: Entity }): void {
    const { world, asteroidEntity } = asteroidContext;
    const asteroid = world.getComponent<AsteroidComponent>(asteroidEntity, "Asteroid");
    const pos = world.getComponent<PositionComponent>(asteroidEntity, "Position");

    if (asteroid && pos) {
      this.executeSplitStrategy({ world, pos, size: asteroid.size });
    }
    this.destroyEntity(world, asteroidEntity);
  }

  private executeSplitStrategy(splitParams: {
    world: World;
    pos: PositionComponent;
    size: AsteroidComponent["size"];
  }): void {
    const { world, pos, size } = splitParams;
    const config = ASTEROID_SPLIT_CONFIG[size];

    if (config) {
      this.spawnSplit({ world, pos, size: config.nextSize, offset: config.offset });
    }
  }

  private spawnSplit(spawnConfig: {
    world: World;
    pos: PositionComponent;
    size: "medium" | "small";
    offset: number;
  }): void {
    const { world, pos, size, offset } = spawnConfig;
    createAsteroid({ world, x: pos.x + offset, y: pos.y + offset, size });
    createAsteroid({ world, x: pos.x - offset, y: pos.y - offset, size });
  }

  private addScore(scoreContext: { world: World; points: number }): void {
    const { world, points } = scoreContext;
    const gameState = getGameState(world);
    gameState.score += points;
  }

  /**
   * Destroys an entity, notifying its pool if it's reclaimable.
   */
  private destroyEntity(world: World, entity: Entity): void {
    const reclaimable = world.getComponent<ReclaimableComponent>(entity, "Reclaimable");
    if (reclaimable) {
      reclaimable.onReclaim(world, entity);
    }
    world.removeEntity(entity);
  }
}
