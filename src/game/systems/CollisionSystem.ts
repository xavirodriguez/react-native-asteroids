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
 *
 * @remarks
 * This system implements circular collision detection for all entities with
 * Position and Collider components. It handles specific interactions like
 * bullet-asteroid (splitting) and ship-asteroid (damage).
 */
export class CollisionSystem extends System {
  /**
   * Updates the collision state for all relevant entities.
   *
   * @param world - The ECS world containing entities and components.
   * @param _deltaTime - The time elapsed since the last frame (unused in this system).
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public update(world: World, _deltaTime: number): void {
    const colliders = world.query("Position", "Collider");
    this.processCollisions(world, colliders);
  }

  /**
   * Iterates through all potential collider pairs and resolves any detected collisions.
   *
   * @param world - The ECS world.
   * @param entities - List of entities to check for collisions.
   */
  private processCollisions(world: World, entities: Entity[]): void {
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        this.checkAndResolve(world, entities[i], entities[j]);
      }
    }
  }

  /**
   * Checks if two specific entities are colliding and resolves it if they are.
   *
   * @param world - The ECS world.
   * @param entityA - The first entity.
   * @param entityB - The second entity.
   */
  private checkAndResolve(world: World, entityA: Entity, entityB: Entity): void {
    if (this.isColliding(world, entityA, entityB)) {
      this.resolveCollision(world, entityA, entityB);
    }
  }

  /**
   * Performs circular collision detection between two entities.
   *
   * @param world - The ECS world.
   * @param entityA - The first entity.
   * @param entityB - The second entity.
   * @returns `true` if the entities' circular colliders overlap.
   */
  private isColliding(world: World, entityA: Entity, entityB: Entity): boolean {
    const posA = world.getComponent<PositionComponent>(entityA, "Position");
    const posB = world.getComponent<PositionComponent>(entityB, "Position");
    const colA = world.getComponent<ColliderComponent>(entityA, "Collider");
    const colB = world.getComponent<ColliderComponent>(entityB, "Collider");

    if (!posA || !posB || !colA || !colB) return false;

    const dx = posA.x - posB.x;
    const dy = posA.y - posB.y;
    const radiusSum = colA.radius + colB.radius;

    return dx * dx + dy * dy < radiusSum * radiusSum;
  }

  /**
   * Dispatches collision resolution based on the types of colliding entities.
   *
   * @param world - The ECS world.
   * @param entityA - The first entity.
   * @param entityB - The second entity.
   */
  private resolveCollision(world: World, entityA: Entity, entityB: Entity): void {
    if (this.checkBulletAsteroid(world, entityA, entityB)) return;
    if (this.checkBulletAsteroid(world, entityB, entityA)) return;

    if (this.checkShipAsteroid(world, entityA, entityB)) return;
    if (this.checkShipAsteroid(world, entityB, entityA)) return;
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
    const asteroid = world.getComponent<AsteroidComponent>(asteroidEntity, "Asteroid");
    const pos = world.getComponent<PositionComponent>(asteroidEntity, "Position");

    if (!asteroid || !pos) return;

    this.spawnSplits(world, pos, asteroid.size);
    world.removeEntity(asteroidEntity);
  }

  private spawnSplits(world: World, pos: PositionComponent, size: "large" | "medium" | "small"): void {
    if (size === "large") {
      this.spawnSplitAsteroids(world, pos, "medium", GAME_CONFIG.ASTEROID_SPLIT_OFFSET_LARGE);
    } else if (size === "medium") {
      this.spawnSplitAsteroids(world, pos, "small", GAME_CONFIG.ASTEROID_SPLIT_OFFSET_MEDIUM);
    }
  }

  private spawnSplitAsteroids(
    world: World,
    pos: PositionComponent,
    newSize: "medium" | "small",
    offset: number
  ): void {
    createAsteroid({ world, x: pos.x + offset, y: pos.y + offset, size: newSize });
    createAsteroid({ world, x: pos.x - offset, y: pos.y - offset, size: newSize });
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
