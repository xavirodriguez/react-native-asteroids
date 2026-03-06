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
    this.processCollisions(world, colliders);
  }

  private processCollisions(world: World, colliders: Entity[]): void {
    for (let i = 0; i < colliders.length; i++) {
      for (let j = i + 1; j < colliders.length; j++) {
        this.checkAndResolve(world, colliders[i], colliders[j]);
      }
    }
  }

  private checkAndResolve(world: World, entityA: Entity, entityB: Entity): void {
    if (this.isColliding(world, entityA, entityB)) {
      this.resolveCollision(world, entityA, entityB);
    }
  }

  private isColliding(world: World, entityA: Entity, entityB: Entity): boolean {
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
    return dx * dx + dy * dy;
  }

  private resolveCollision(world: World, entityA: Entity, entityB: Entity): void {
    const isBulletAsteroid = this.checkBulletAsteroid(world, entityA, entityB);
    if (isBulletAsteroid) return;

    this.checkShipAsteroid(world, entityA, entityB);
    this.checkShipAsteroid(world, entityB, entityA);
  }

  private checkBulletAsteroid(world: World, entityA: Entity, entityB: Entity): boolean {
    if (this.isBulletAsteroidPair(world, entityA, entityB)) {
      this.handleBulletAsteroidCollision(world, entityA, entityB);
      return true;
    }
    if (this.isBulletAsteroidPair(world, entityB, entityA)) {
      this.handleBulletAsteroidCollision(world, entityB, entityA);
      return true;
    }
    return false;
  }

  private checkShipAsteroid(world: World, entityA: Entity, entityB: Entity): void {
    if (this.isShipAsteroidPair(world, entityA, entityB)) {
      this.handleShipAsteroidCollision(world, entityA);
    }
  }

  private isBulletAsteroidPair(world: World, entityA: Entity, entityB: Entity): boolean {
    const hasAsteroid = world.getComponent(entityA, "Asteroid") !== undefined;
    const hasBullet = world.getComponent(entityB, "Bullet") !== undefined;
    return hasAsteroid && hasBullet;
  }

  private isShipAsteroidPair(world: World, entityA: Entity, entityB: Entity): boolean {
    const hasHealth = world.getComponent(entityA, "Health") !== undefined;
    const hasAsteroid = world.getComponent(entityB, "Asteroid") !== undefined;
    return hasHealth && hasAsteroid;
  }

  private handleBulletAsteroidCollision(world: World, asteroid: Entity, bullet: Entity): void {
    this.splitAsteroid(world, asteroid);
    world.removeEntity(bullet);
    this.addScore(world, GAME_CONFIG.ASTEROID_SCORE);
  }

  private handleShipAsteroidCollision(world: World, shipEntity: Entity): void {
    const health = world.getComponent<HealthComponent>(shipEntity, "Health");
    const canTakeDamage = health && health.invulnerableRemaining <= 0;
    if (canTakeDamage) {
      health.current--;
      health.invulnerableRemaining = GAME_CONFIG.INVULNERABILITY_DURATION;
    }
  }

  private splitAsteroid(world: World, asteroidEntity: Entity): void {
    const asteroid = world.getComponent<AsteroidComponent>(asteroidEntity, "Asteroid");
    const pos = world.getComponent<PositionComponent>(asteroidEntity, "Position");

    if (asteroid && pos) {
      this.executeSplitStrategy(world, pos, asteroid.size);
    }
    world.removeEntity(asteroidEntity);
  }

  private executeSplitStrategy(world: World, pos: PositionComponent, size: string): void {
    if (size === "large") {
      this.spawnSplit(world, pos, "medium", GAME_CONFIG.ASTEROID_SPLIT_OFFSET_LARGE);
    } else if (size === "medium") {
      this.spawnSplit(world, pos, "small", GAME_CONFIG.ASTEROID_SPLIT_OFFSET_MEDIUM);
    }
  }

  private spawnSplit(world: World, pos: PositionComponent, size: "medium" | "small", offset: number): void {
    createAsteroid({ world, x: pos.x + offset, y: pos.y + offset, size });
    createAsteroid({ world, x: pos.x - offset, y: pos.y - offset, size });
  }

  private addScore(world: World, points: number): void {
    const gameStates = world.query("GameState");
    if (gameStates.length === 0) return;

    const gameState = world.getComponent<GameStateComponent>(gameStates[0], "GameState");
    if (gameState) {
      gameState.score += points;
    }
  }
}
