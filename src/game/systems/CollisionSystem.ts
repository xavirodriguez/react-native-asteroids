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
import { getGameState } from "../GameUtils"

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

  private processCollisions(params: { world: World; colliders: Entity[] }): void {
    const { world, colliders } = params;
    for (let i = 0; i < colliders.length; i++) {
      for (let j = i + 1; j < colliders.length; j++) {
        this.checkAndResolve({ world, entityA: colliders[i], entityB: colliders[j] });
      }
    }
  }

  private checkAndResolve(params: { world: World; entityA: Entity; entityB: Entity }): void {
    const { world, entityA, entityB } = params;
    const isColliding = this.isColliding({ world, entityA, entityB });
    if (isColliding) {
      this.resolveCollision({ world, entityA, entityB });
    }
  }

  private isColliding(params: { world: World; entityA: Entity; entityB: Entity }): boolean {
    const { world, entityA, entityB } = params;
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

  private resolveCollision(params: { world: World; entityA: Entity; entityB: Entity }): void {
    const { world, entityA, entityB } = params
    const pair = { entityA, entityB }

    const isBulletAsteroid = this.matchPair(world, pair, "Bullet", "Asteroid")
    if (isBulletAsteroid) {
      this.handleBulletAsteroidCollision({ world, asteroid: isBulletAsteroid.Asteroid, bullet: isBulletAsteroid.Bullet })
      return
    }

    const isShipAsteroid = this.matchPair(world, pair, "Ship", "Asteroid")
    if (isShipAsteroid) {
      this.handleShipAsteroidCollision({ world, shipEntity: isShipAsteroid.Ship })
    }
  }

  private matchPair<T1 extends string, T2 extends string>(
    world: World,
    pair: { entityA: Entity; entityB: Entity },
    type1: T1,
    type2: T2
  ): Record<T1 | T2, Entity> | undefined {
    const { entityA, entityB } = pair
    if (world.hasComponent(entityA, type1) && world.hasComponent(entityB, type2)) {
      return { [type1]: entityA, [type2]: entityB } as Record<T1 | T2, Entity>
    }
    if (world.hasComponent(entityB, type1) && world.hasComponent(entityA, type2)) {
      return { [type1]: entityB, [type2]: entityA } as Record<T1 | T2, Entity>
    }
    return undefined
  }

  private handleBulletAsteroidCollision(params: { world: World; asteroid: Entity; bullet: Entity }): void {
    const { world, asteroid, bullet } = params;
    this.splitAsteroid({ world, asteroidEntity: asteroid });
    world.removeEntity(bullet);
    this.addScore({ world, points: GAME_CONFIG.ASTEROID_SCORE });
  }

  private handleShipAsteroidCollision(params: { world: World; shipEntity: Entity }): void {
    const { world, shipEntity } = params;
    const health = world.getComponent<HealthComponent>(shipEntity, "Health");
    const canTakeDamage = health && health.invulnerableRemaining <= 0;
    if (canTakeDamage) {
      health.current--;
      health.invulnerableRemaining = GAME_CONFIG.INVULNERABILITY_DURATION;
    }
  }

  private splitAsteroid(params: { world: World; asteroidEntity: Entity }): void {
    const { world, asteroidEntity } = params;
    const asteroid = world.getComponent<AsteroidComponent>(asteroidEntity, "Asteroid");
    const pos = world.getComponent<PositionComponent>(asteroidEntity, "Position");

    if (asteroid && pos) {
      this.executeSplitStrategy({ world, pos, size: asteroid.size });
    }
    world.removeEntity(asteroidEntity);
  }

  private executeSplitStrategy(params: { world: World; pos: PositionComponent; size: string }): void {
    const { world, pos, size } = params;
    const splitConfigs: Record<string, { nextSize: "medium" | "small"; offset: number }> = {
      large: { nextSize: "medium", offset: GAME_CONFIG.ASTEROID_SPLIT_OFFSET_LARGE },
      medium: { nextSize: "small", offset: GAME_CONFIG.ASTEROID_SPLIT_OFFSET_MEDIUM },
    };

    const config = splitConfigs[size];
    if (config) {
      this.spawnSplit({ world, pos, size: config.nextSize, offset: config.offset });
    }
  }

  private spawnSplit(params: {
    world: World
    pos: PositionComponent
    size: "medium" | "small"
    offset: number
  }): void {
    const { world, pos, size, offset } = params
    createAsteroid({ world, x: pos.x + offset, y: pos.y + offset, size });
    createAsteroid({ world, x: pos.x - offset, y: pos.y - offset, size });
  }

  private addScore(params: { world: World; points: number }): void {
    const { world, points } = params;
    const gameState = getGameState(world);
    gameState.score += points;
  }
}
