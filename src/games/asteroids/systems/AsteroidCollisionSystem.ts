import { World } from "../../../engine/core/World";
import { CollisionSystem } from "../../../engine/systems/CollisionSystem";
import {
  type TransformComponent,
  type AsteroidComponent,
  type HealthComponent,
  type Entity,
  type ComponentType,
  GAME_CONFIG,
  RenderComponent,
  ReclaimableComponent,
} from "../../../types/GameTypes";

import { createAsteroid, createParticle } from "../EntityFactory";
import { type GameStateComponent } from "../types/AsteroidTypes";
import { ScreenShakeComponent } from "../../../engine/types/EngineTypes";
import { hapticDamage, hapticDeath } from "../../../utils/haptics";
import { ParticlePool } from "../EntityPool";
import { RandomService } from "../../../engine/utils/RandomService";

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

    if (this.handleBulletAsteroidPair({ world, entityA, entityB })) return;
    if (this.handleShipAsteroidPair({ world, entityA, entityB })) return;
    if (this.handleBulletUfoPair({ world, entityA, entityB })) return;
    this.handleShipUfoPair({ world, entityA, entityB });
  }

  private handleBulletUfoPair(context: {
    world: World;
    entityA: Entity;
    entityB: Entity;
  }): boolean {
    const { world, entityA, entityB } = context;
    const match = this.matchPair(world, entityA, entityB, "Bullet", "Ufo");

    if (match) {
      const { Ufo, Bullet } = match;
      const pos = world.getComponent<TransformComponent>(Ufo, "Transform");
      if (pos) {
        this.spawnExplosionParticles(world, pos, GAME_CONFIG.PARTICLE_COUNT * 2);
      }
      this.destroyEntity(world, Ufo);
      this.destroyEntity(world, Bullet);
      this.addScore({ world, points: 100 });
      return true;
    }
    return false;
  }

  private handleShipUfoPair(context: {
    world: World;
    entityA: Entity;
    entityB: Entity;
  }): boolean {
    const { world, entityA, entityB } = context;
    const match = this.matchPair(world, entityA, entityB, "Ship", "Ufo");

    if (match) {
      const { Ship, Ufo } = match;
      const health = world.getComponent<HealthComponent>(Ship, "Health");
      if (this.canShipTakeDamage(health)) {
        this.applyDamageToShip(world, health);
        const pos = world.getComponent<TransformComponent>(Ufo, "Transform");
        if (pos) {
          this.spawnExplosionParticles(world, pos, GAME_CONFIG.PARTICLE_COUNT * 2);
        }
        this.destroyEntity(world, Ufo);
      }
      return true;
    }
    return false;
  }

  private handleBulletAsteroidPair(context: {
    world: World;
    entityA: Entity;
    entityB: Entity;
  }): boolean {
    const { world, entityA, entityB } = context;
    const match = this.matchPair(world, entityA, entityB, "Bullet", "Asteroid");

    if (match) {
      this.handleBulletAsteroidCollision({
        world,
        asteroid: match.Asteroid,
        bullet: match.Bullet,
      });
      return true;
    }
    return false;
  }

  private handleShipAsteroidPair(context: {
    world: World;
    entityA: Entity;
    entityB: Entity;
  }): boolean {
    const { world, entityA, entityB } = context;
    const match = this.matchPair(world, entityA, entityB, "Ship", "Asteroid");

    if (match) {
      this.handleShipAsteroidCollision({ world, shipEntity: match.Ship });
      return true;
    }
    return false;
  }

  private handleBulletAsteroidCollision(context: {
    world: World;
    asteroid: Entity;
    bullet: Entity;
  }): void {
    const { world, asteroid, bullet } = context;
    const pos = world.getComponent<TransformComponent>(asteroid, "Transform");
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

  private spawnExplosionParticles(world: World, pos: TransformComponent, count: number): void {
    for (let i = 0; i < count; i++) {
      createParticle({
        world,
        x: pos.x,
        y: pos.y,
        dx: (RandomService.next() - 0.5) * 160, // [-80, 80]
        dy: (RandomService.next() - 0.5) * 160, // [-80, 80]
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

    const shake = world.getSingleton<ScreenShakeComponent>("ScreenShake");
    if (shake) {
      shake.config = {
        intensity: 8,
        duration: 15,
      };
    }

    if (health.current <= 0) {
      hapticDeath();
    } else {
      hapticDamage();
    }
  }

  private splitAsteroid(asteroidContext: { world: World; asteroidEntity: Entity }): void {
    const { world, asteroidEntity } = asteroidContext;
    const asteroid = world.getComponent<AsteroidComponent>(asteroidEntity, "Asteroid");
    const pos = world.getComponent<TransformComponent>(asteroidEntity, "Transform");

    if (asteroid && pos) {
      this.executeSplitStrategy({ world, pos, size: asteroid.size });
    }
    this.destroyEntity(world, asteroidEntity);
  }

  private executeSplitStrategy(splitParams: {
    world: World;
    pos: TransformComponent;
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
    pos: TransformComponent;
    size: "medium" | "small";
    offset: number;
  }): void {
    const { world, pos, size, offset } = spawnConfig;
    const a1 = createAsteroid({ world, x: pos.x + offset, y: pos.y + offset, size });
    const a2 = createAsteroid({ world, x: pos.x - offset, y: pos.y - offset, size });

    // Improvement 9: Apply hit flash to split children
    [a1, a2].forEach(entity => {
      const render = world.getComponent<RenderComponent>(entity, "Render");
      if (render) render.hitFlashFrames = 10;
    });
  }

  private addScore(scoreContext: { world: World; points: number }): void {
    const { world, points } = scoreContext;
    const gameState = world.getSingleton<GameStateComponent>("GameState");
    if (gameState) {
      gameState.score += points;
    }
  }

}
