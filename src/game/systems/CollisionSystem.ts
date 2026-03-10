import { System, type World } from "../ecs-world"
import {
  type PositionComponent,
  type ColliderComponent,
  type AsteroidComponent,
  type HealthComponent,
  type GameStateComponent,
  type Entity,
  GAME_CONFIG,
} from "../../types/GameTypes"

import { createAsteroid } from "../EntityFactory"

/**
 * System responsible for detecting and resolving collisions between entities.
 */
export class CollisionSystem extends System {
  /**
   * Updates the collision state for all relevant entities.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public update(world: World, deltaTime: number): void {
    const colliders = world.query("Position", "Collider");
    const hasEnoughColliders = colliders.length >= 2;
    if (hasEnoughColliders) {
      this.processCollisions({ world, colliders });
    }
  }

  private processCollisions(context: { world: World; colliders: Entity[] }): void {
    const { world, colliders } = context;
    for (let i = 0; i < colliders.length; i++) {
      for (let j = i + 1; j < colliders.length; j++) {
        this.checkAndResolve({ world, entityA: colliders[i], entityB: colliders[j] });
      }
    }
  }

  private checkAndResolve(context: { world: World; entityA: Entity; entityB: Entity }): void {
    const { world, entityA, entityB } = context;
    const isColliding = this.isColliding({ world, entityA, entityB });
    if (isColliding) {
      this.resolveCollision({ world, entityA, entityB });
    }
  }

  private isColliding(context: { world: World; entityA: Entity; entityB: Entity }): boolean {
    const { world, entityA, entityB } = context;
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

  private resolveCollision(context: { world: World; entityA: Entity; entityB: Entity }): void {
    const { world, entityA, entityB } = context;
    const isBulletAsteroid = this.resolveBulletAsteroidCollision({ world, entityA, entityB });
    if (isBulletAsteroid) return;

    this.resolveShipAsteroidCollision({ world, ship: entityA, asteroid: entityB });
    this.resolveShipAsteroidCollision({ world, ship: entityB, asteroid: entityA });
  }

  private resolveBulletAsteroidCollision(context: { world: World; entityA: Entity; entityB: Entity }): boolean {
    const { world, entityA, entityB } = context;
    if (this.isBulletAsteroidPair({ world, entityA, entityB })) {
      this.handleBulletAsteroidCollision({ world, asteroid: entityA, bullet: entityB });
      return true;
    }
    if (this.isBulletAsteroidPair({ world, entityA: entityB, entityB: entityA })) {
      this.handleBulletAsteroidCollision({ world, asteroid: entityB, bullet: entityA });
      return true;
    }
    return false;
  }

  private resolveShipAsteroidCollision(context: { world: World; ship: Entity; asteroid: Entity }): void {
    const { world, ship, asteroid } = context;
    if (this.isShipAsteroidPair({ world, ship, asteroid })) {
      this.handleShipAsteroidCollision({ world, shipEntity: ship });
    }
  }

  private isBulletAsteroidPair(context: { world: World; entityA: Entity; entityB: Entity }): boolean {
    const { world, entityA, entityB } = context;
    const hasAsteroid = world.hasComponent(entityA, "Asteroid");
    const hasBullet = world.hasComponent(entityB, "Bullet");
    return hasAsteroid && hasBullet;
  }

  private isShipAsteroidPair(context: { world: World; ship: Entity; asteroid: Entity }): boolean {
    const { world, ship, asteroid } = context;
    const hasHealth = world.hasComponent(ship, "Health");
    const hasAsteroid = world.hasComponent(asteroid, "Asteroid");
    return hasHealth && hasAsteroid;
  }

  private handleBulletAsteroidCollision(context: { world: World; asteroid: Entity; bullet: Entity }): void {
    const { world, asteroid, bullet } = context;
    this.splitAsteroid({ world, asteroidEntity: asteroid });
    world.removeEntity(bullet);
    this.addScore({ world, points: GAME_CONFIG.ASTEROID_SCORE });
  }

  private handleShipAsteroidCollision(context: { world: World; shipEntity: Entity }): void {
    const { world, shipEntity } = context;
    const health = world.getComponent<HealthComponent>(shipEntity, "Health");
    const canTakeDamage = health && health.invulnerableRemaining <= 0;
    if (canTakeDamage) {
      health.current--;
      health.invulnerableRemaining = GAME_CONFIG.INVULNERABILITY_DURATION;
    }
  }

  private splitAsteroid(context: { world: World; asteroidEntity: Entity }): void {
    const { world, asteroidEntity } = context;
    const asteroid = world.getComponent<AsteroidComponent>(asteroidEntity, "Asteroid");
    const pos = world.getComponent<PositionComponent>(asteroidEntity, "Position");

    if (asteroid && pos) {
      this.executeSplitStrategy({ world, pos, size: asteroid.size });
    }
    world.removeEntity(asteroidEntity);
  }

  private executeSplitStrategy(context: { world: World; pos: PositionComponent; size: string }): void {
    const { world, pos, size } = context;
    if (size === "large") {
      this.spawnSplit({ world, pos, size: "medium", offset: GAME_CONFIG.ASTEROID_SPLIT_OFFSET_LARGE });
    } else if (size === "medium") {
      this.spawnSplit({ world, pos, size: "small", offset: GAME_CONFIG.ASTEROID_SPLIT_OFFSET_MEDIUM });
    }
  }

  private spawnSplit(context: {
    world: World
    pos: PositionComponent
    size: "medium" | "small"
    offset: number
  }): void {
    const { world, pos, size, offset } = context
    createAsteroid({ world, x: pos.x + offset, y: pos.y + offset, size });
    createAsteroid({ world, x: pos.x - offset, y: pos.y - offset, size });
  }

  private addScore(context: { world: World; points: number }): void {
    const { world, points } = context;
    const gameStates = world.query("GameState");
    if (gameStates.length === 0) return;

    const gameState = world.getComponent<GameStateComponent>(gameStates[0], "GameState");
    if (gameState) {
      gameState.score += points;
    }
  }
}
