import { System, type World } from "../ecs-world"
import {
  type PositionComponent,
  type ColliderComponent,
  type AsteroidComponent,
  type HealthComponent,
  type Entity,
  type ComponentType,
  GAME_CONFIG,
} from "../../types/GameTypes"

import { createAsteroid, createParticle } from "../EntityFactory"
import { getGameState } from "../GameUtils"
import { hapticDamage, hapticDeath } from "../../utils/haptics"

/**
 * System responsible for detecting and resolving collisions between entities.
 */
export class CollisionSystem extends System {
  /**
   * Updates the collision state for all relevant entities.
   */
  public update(world: World, deltaTime: number): void {
    void deltaTime
    const colliders = world.query("Position", "Collider");
    const hasEnoughColliders = colliders.length >= 2;
    if (hasEnoughColliders) {
      this.processCollisions({ world, colliders });
    }
  }

  private processCollisions(context: { world: World; colliders: Entity[] }): void {
    const { world, colliders } = context;
    colliders.forEach((entityA, index) => {
      this.checkEntityCollisions({ world, entityA, colliders, startIndex: index + 1 });
    });
  }

  private checkEntityCollisions(context: {
    world: World
    entityA: Entity
    colliders: Entity[]
    startIndex: number
  }): void {
    const { world, entityA, colliders, startIndex } = context;
    for (let j = startIndex; j < colliders.length; j++) {
      this.checkAndResolve({ world, entityA, entityB: colliders[j] });
    }
  }

  private checkAndResolve(collisionPair: { world: World; entityA: Entity; entityB: Entity }): void {
    const { world, entityA, entityB } = collisionPair;
    const isColliding = this.isColliding({ world, entityA, entityB });
    if (isColliding) {
      this.resolveCollision({ world, entityA, entityB });
    }
  }

  private isColliding(collisionPair: { world: World; entityA: Entity; entityB: Entity }): boolean {
    const { world, entityA, entityB } = collisionPair;
    const posA = world.getComponent<PositionComponent>(entityA, "Position");
    const posB = world.getComponent<PositionComponent>(entityB, "Position");
    const colA = world.getComponent<ColliderComponent>(entityA, "Collider");
    const colB = world.getComponent<ColliderComponent>(entityB, "Collider");

    if (!posA || !posB || !colA || !colB) return false;

    const squaredDistance = this.calculateSquaredDistance(posA, posB);
    const radiusSum = colA.radius + colB.radius;

    return squaredDistance < radiusSum * radiusSum;
  }

  private calculateSquaredDistance(posA: PositionComponent, posB: PositionComponent): number {
    const dx = posA.x - posB.x;
    const dy = posA.y - posB.y;
    const squaredX = dx * dx;
    const squaredY = dy * dy;
    return squaredX + squaredY;
  }

  private resolveCollision(collisionPair: { world: World; entityA: Entity; entityB: Entity }): void {
    const { world, entityA, entityB } = collisionPair;
    const pair = { entityA, entityB };

    if (this.handleBulletAsteroidPair({ world, pair })) return;
    this.handleShipAsteroidPair({ world, pair });
  }

  private handleBulletAsteroidPair(context: {
    world: World
    pair: { entityA: Entity; entityB: Entity }
  }): boolean {
    const { world, pair } = context;
    const match = this.matchPair({ world, pair, type1: "Bullet", type2: "Asteroid" });

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
    world: World
    pair: { entityA: Entity; entityB: Entity }
  }): void {
    const { world, pair } = context;
    const match = this.matchPair({ world, pair, type1: "Ship", type2: "Asteroid" });

    if (match) {
      this.handleShipAsteroidCollision({ world, shipEntity: match.Ship });
    }
  }

  private matchPair<T1 extends ComponentType, T2 extends ComponentType>(config: {
    world: World
    pair: { entityA: Entity; entityB: Entity }
    type1: T1
    type2: T2
  }): Record<T1 | T2, Entity> | undefined {
    const { world, pair, type1, type2 } = config
    const { entityA, entityB } = pair

    if (world.hasComponent(entityA, type1) && world.hasComponent(entityB, type2)) {
      return { [type1]: entityA, [type2]: entityB } as Record<T1 | T2, Entity>
    }
    if (world.hasComponent(entityB, type1) && world.hasComponent(entityA, type2)) {
      return { [type1]: entityB, [type2]: entityA } as Record<T1 | T2, Entity>
    }
    return undefined
  }

  private handleBulletAsteroidCollision(context: { world: World; asteroid: Entity; bullet: Entity }): void {
    const { world, asteroid, bullet } = context;
    const pos = world.getComponent<PositionComponent>(asteroid, "Position");
    if (pos) {
      this.spawnExplosionParticles(world, pos, 8);
    }
    this.splitAsteroid({ world, asteroidEntity: asteroid });
    world.removeEntity(bullet);
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
        ttl: 500,
      });
    }
  }

  private handleShipAsteroidCollision(context: { world: World; shipEntity: Entity }): void {
    const { world, shipEntity } = context;
    const health = world.getComponent<HealthComponent>(shipEntity, "Health");
    const canTakeDamage = health && health.invulnerableRemaining <= 0;
    if (canTakeDamage) {
      health.current--;
      health.invulnerableRemaining = GAME_CONFIG.INVULNERABILITY_DURATION;

      if (health.current <= 0) {
        hapticDeath();
      } else {
        hapticDamage();
      }
    }
  }

  private splitAsteroid(asteroidContext: { world: World; asteroidEntity: Entity }): void {
    const { world, asteroidEntity } = asteroidContext;
    const asteroid = world.getComponent<AsteroidComponent>(asteroidEntity, "Asteroid");
    const pos = world.getComponent<PositionComponent>(asteroidEntity, "Position");

    if (asteroid && pos) {
      this.executeSplitStrategy({ world, pos, size: asteroid.size });
    }
    world.removeEntity(asteroidEntity);
  }

  private executeSplitStrategy(splitParams: {
    world: World
    pos: PositionComponent
    size: AsteroidComponent["size"]
  }): void {
    const { world, pos, size } = splitParams;
    const config = this.getSplitConfig(size);

    if (config) {
      this.spawnSplit({ world, pos, size: config.nextSize, offset: config.offset });
    }
  }

  private getSplitConfig(size: AsteroidComponent["size"]) {
    const splitConfigs: Record<
      AsteroidComponent["size"],
      { nextSize: "medium" | "small"; offset: number } | undefined
    > = {
      large: { nextSize: "medium", offset: GAME_CONFIG.ASTEROID_SPLIT_OFFSET_LARGE },
      medium: { nextSize: "small", offset: GAME_CONFIG.ASTEROID_SPLIT_OFFSET_MEDIUM },
      small: undefined,
    };
    return splitConfigs[size];
  }

  private spawnSplit(spawnConfig: {
    world: World
    pos: PositionComponent
    size: "medium" | "small"
    offset: number
  }): void {
    const { world, pos, size, offset } = spawnConfig
    createAsteroid({ world, x: pos.x + offset, y: pos.y + offset, size });
    createAsteroid({ world, x: pos.x - offset, y: pos.y - offset, size });
  }

  private addScore(scoreContext: { world: World; points: number }): void {
    const { world, points } = scoreContext;
    const gameState = getGameState(world);
    gameState.score += points;
  }
}
