import { System, type World } from "../ecs-world"
import {
  type PositionComponent,
  type ColliderComponent,
  type AsteroidComponent,
  type HealthComponent,
  type GameStateComponent,
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

    for (let i = 0; i < colliders.length; i++) {
      for (let j = i + 1; j < colliders.length; j++) {
        const entityA = colliders[i];
        const entityB = colliders[j];

        if (this.isColliding(world, entityA, entityB)) {
          this.resolveCollision(world, entityA, entityB);
        }
      }
    }
  }

  private isColliding(world: World, entityA: number, entityB: number): boolean {
    const posA = world.getComponent<PositionComponent>(entityA, "Position");
    const posB = world.getComponent<PositionComponent>(entityB, "Position");
    const colA = world.getComponent<ColliderComponent>(entityA, "Collider");
    const colB = world.getComponent<ColliderComponent>(entityB, "Collider");

    if (!posA || !posB || !colA || !colB) return false;

    const dx = posA.x - posB.x;
    const dy = posA.y - posB.y;
    const distanceSq = dx * dx + dy * dy;
    const combinedRadius = colA.radius + colB.radius;

    return distanceSq < combinedRadius * combinedRadius;
  }

  private resolveCollision(world: World, entityA: number, entityB: number): void {
    if (this.checkBulletAsteroid(world, entityA, entityB)) return;
    if (this.checkBulletAsteroid(world, entityB, entityA)) return;
    
    if (this.checkShipAsteroid(world, entityA, entityB)) return;
    if (this.checkShipAsteroid(world, entityB, entityA)) return;
  }

  private checkBulletAsteroid(world: World, entityA: number, entityB: number): boolean {
    const asteroid = world.getComponent<AsteroidComponent>(entityA, "Asteroid");
    const isBullet = world.getComponent(entityB, "TTL") !== undefined;

    if (asteroid && isBullet) {
      this.handleBulletAsteroidCollision(world, entityA, entityB);
      return true;
    }
    return false;
  }

  private checkShipAsteroid(world: World, entityA: number, entityB: number): boolean {
    const health = world.getComponent<HealthComponent>(entityA, "Health");
    const isAsteroid = world.getComponent(entityB, "Asteroid") !== undefined;

    if (health && isAsteroid) {
      this.handleShipAsteroidCollision(health);
      return true;
    }
    return false;
  }

  private handleBulletAsteroidCollision(world: World, asteroidEntity: number, bulletEntity: number): void {
    this.splitAsteroid(world, asteroidEntity);
    world.removeEntity(bulletEntity);
    this.addScore(world, GAME_CONFIG.ASTEROID_SCORE);
  }

  private handleShipAsteroidCollision(health: HealthComponent): void {
    const invulnerableTime = health.invulnerableRemaining;
    if (invulnerableTime <= 0) {
      health.current--;
      health.invulnerableRemaining = GAME_CONFIG.INVULNERABILITY_DURATION;
    }
  }

  private splitAsteroid(world: World, asteroidEntity: number): void {
    const asteroid = world.getComponent<AsteroidComponent>(asteroidEntity, "Asteroid");
    const pos = world.getComponent<PositionComponent>(asteroidEntity, "Position");

    if (!asteroid || !pos) return;

    // Split strategy mapping to avoid multiple if/else blocks
    const splitStrategies: Record<string, () => void> = {
      large: () => this.spawnSplitAsteroids(world, pos, "medium", GAME_CONFIG.ASTEROID_SPLIT_OFFSET_LARGE),
      medium: () => this.spawnSplitAsteroids(world, pos, "small", GAME_CONFIG.ASTEROID_SPLIT_OFFSET_MEDIUM),
      small: () => { /* Small asteroids just disappear */ }
    };

    const strategy = splitStrategies[asteroid.size];
    if (strategy) {
      strategy();
    }

    world.removeEntity(asteroidEntity);
  }

  private spawnSplitAsteroids(
    world: World,
    pos: PositionComponent,
    newSize: "medium" | "small",
    offset: number
  ): void {
    const posX = pos.x;
    const posY = pos.y;

    createAsteroid(world, posX + offset, posY + offset, newSize);
    createAsteroid(world, posX - offset, posY - offset, newSize);
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
