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
 * Detects and resolves collisions between entities.
 *
 * @remarks
 * Processes all entities with a {@link ColliderComponent} and {@link PositionComponent}
 * to check for circular overlaps and execute specific resolution logic based on entity types.
 */
export class CollisionSystem extends System {
  /**
   * Updates the collision state for all relevant entities.
   *
   * @param world - The ECS world instance.
   * @param deltaTime - Time since last update in milliseconds.
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
    const wasBulletCollision =
      this.checkBulletAsteroid(world, entityA, entityB) ||
      this.checkBulletAsteroid(world, entityB, entityA);

    if (wasBulletCollision) return;

    this.checkShipAsteroid(world, entityA, entityB);
    this.checkShipAsteroid(world, entityB, entityA);
  }

  private checkBulletAsteroid(world: World, entityA: Entity, entityB: Entity): boolean {
    const asteroid = world.getComponent<AsteroidComponent>(entityA, "Asteroid");
    const isBullet = world.getComponent(entityB, "Bullet") !== undefined;

    if (asteroid && isBullet) {
      this.handleBulletAsteroidCollision(world, entityA, entityB);
      return true;
    }
    return false;
  }

  private checkShipAsteroid(world: World, entityA: Entity, entityB: Entity): boolean {
    const health = world.getComponent<HealthComponent>(entityA, "Health");
    const isAsteroid = world.getComponent(entityB, "Asteroid") !== undefined;

    if (health && isAsteroid) {
      this.handleShipAsteroidCollision(health);
      return true;
    }
    return false;
  }

  private handleBulletAsteroidCollision(world: World, asteroidEntity: Entity, bulletEntity: Entity): void {
    this.splitAsteroid(world, asteroidEntity);
    world.removeEntity(bulletEntity);
    this.addScore(world, GAME_CONFIG.ASTEROID_SCORE);
  }

  private handleShipAsteroidCollision(health: HealthComponent): void {
    if (health.invulnerableRemaining <= 0) {
      health.current--;
      health.invulnerableRemaining = GAME_CONFIG.INVULNERABILITY_DURATION;
    }
  }

  private splitAsteroid(world: World, asteroidEntity: Entity): void {
    const asteroid = world.getComponent<AsteroidComponent>(asteroidEntity, "Asteroid")
    const pos = world.getComponent<PositionComponent>(asteroidEntity, "Position")

    if (!asteroid || !pos) return

    this.executeSplitStrategy(world, pos, asteroid.size)
    world.removeEntity(asteroidEntity)
  }

  private executeSplitStrategy(world: World, pos: PositionComponent, size: string): void {
    if (size === "large") {
      this.spawnSplit(world, pos, "medium", GAME_CONFIG.ASTEROID_SPLIT_OFFSET_LARGE)
    } else if (size === "medium") {
      this.spawnSplit(world, pos, "small", GAME_CONFIG.ASTEROID_SPLIT_OFFSET_MEDIUM)
    }
  }

  private spawnSplit(world: World, pos: PositionComponent, newSize: "medium" | "small", offset: number): void {
    this.spawnSplitAsteroids({ world, pos, newSize, offset })
  }

  private spawnSplitAsteroids(params: {
    world: World
    pos: PositionComponent
    newSize: "medium" | "small"
    offset: number
  }): void {
    const { world, pos, newSize, offset } = params
    createAsteroid({ world, x: pos.x + offset, y: pos.y + offset, size: newSize })
    createAsteroid({ world, x: pos.x - offset, y: pos.y - offset, size: newSize })
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
