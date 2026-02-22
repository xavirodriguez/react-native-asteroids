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
 *
 * @remarks
 * This system performs a pairwise check between all entities with {@link PositionComponent}
 * and {@link ColliderComponent}. It handles specific interactions:
 * - **Bullet vs Asteroid**: Splits the asteroid and increases the score.
 * - **Ship vs Asteroid**: Decreases ship health.
 *
 * Performance note: This system currently has $O(N^2)$ complexity where $N$ is the number of colliders.
 */
export class CollisionSystem extends System {
  /**
   * Updates the collision state for all relevant entities.
   *
   * @param world - The ECS world.
   * @param _deltaTime - Time since last frame (not used for collision detection but part of the System interface).
   */
  update(world: World, _deltaTime: number): void {
    void _deltaTime;
    const colliders = world.query("Position", "Collider")

    // Check all pairs ($O(N^2)$ complexity)
    for (let i = 0; i < colliders.length; i++) {
      for (let j = i + 1; j < colliders.length; j++) {
        const entityA = colliders[i]
        const entityB = colliders[j]

        if (this.checkCollision(world, entityA, entityB)) {
          this.handleCollision(world, entityA, entityB)
        }
      }
    }
  }

  /**
   * Checks if two entities are colliding based on their circular colliders.
   *
   * @param world - The ECS world.
   * @param entityA - First entity ID.
   * @param entityB - Second entity ID.
   * @returns `true` if colliding, `false` otherwise.
   *
   * @remarks
   * Uses simple circle-circle collision detection based on the distance between centers.
   */
  private checkCollision(world: World, entityA: number, entityB: number): boolean {
    const posA = world.getComponent<PositionComponent>(entityA, "Position")
    const posB = world.getComponent<PositionComponent>(entityB, "Position")
    const colliderA = world.getComponent<ColliderComponent>(entityA, "Collider")
    const colliderB = world.getComponent<ColliderComponent>(entityB, "Collider")

    if (!posA || !posB || !colliderA || !colliderB) {
      return false
    }

    const dx = posA.x - posB.x
    const dy = posA.y - posB.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    return distance < colliderA.radius + colliderB.radius
  }

  /**
   * Resolves the collision between two entities based on their types.
   *
   * @param world - The ECS world.
   * @param entityA - First entity ID.
   * @param entityB - Second entity ID.
   *
   * @remarks
   * Handles Bullet vs Asteroid and Ship vs Asteroid collisions.
   */
  private handleCollision(world: World, entityA: number, entityB: number): void {
    const asteroidA = world.getComponent(entityA, "Asteroid")
    const asteroidB = world.getComponent(entityB, "Asteroid")
    const healthA = world.getComponent<HealthComponent>(entityA, "Health")
    const healthB = world.getComponent<HealthComponent>(entityB, "Health")
    const ttlA = world.getComponent(entityA, "TTL")
    const ttlB = world.getComponent(entityB, "TTL")

    const posA = world.getComponent<PositionComponent>(entityA, "Position")
    const posB = world.getComponent<PositionComponent>(entityB, "Position")
    
    if (!posA || !posB) {
      return
    }

    // Bullet hits asteroid
    if (asteroidA && ttlB) {
      this.splitAsteroid(world, entityA)
      world.removeEntity(entityB)
      this.addScore(world, 10)
    } else if (asteroidB && ttlA) {
      this.splitAsteroid(world, entityB)
      world.removeEntity(entityA)
      this.addScore(world, 10)
    }

    // Ship hits asteroid
    if (healthA && asteroidB) {
      if (healthA.invulnerableRemaining <= 0) {
        healthA.current--
        healthA.invulnerableRemaining = GAME_CONFIG.INVULNERABILITY_DURATION
      }
    } else if (healthB && asteroidA) {
      if (healthB.invulnerableRemaining <= 0) {
        healthB.current--
        healthB.invulnerableRemaining = GAME_CONFIG.INVULNERABILITY_DURATION
      }
    }
  
  }

  /**
   * Splits an asteroid into two smaller ones or removes it if it's already small.
   *
   * @param world - The ECS world.
   * @param asteroidEntity - The asteroid entity to split.
   *
   * @remarks
   * Large asteroids split into two medium ones, medium into two small ones, and small ones are destroyed.
   */
  private splitAsteroid(world: World, asteroidEntity: number): void {
    const asteroid = world.getComponent<AsteroidComponent>(asteroidEntity, "Asteroid")
    const pos = world.getComponent<PositionComponent>(asteroidEntity, "Position")

    if (!asteroid || !pos) {
      return
    }

    if (asteroid.size === "large") {
      createAsteroid(world, pos.x + 10, pos.y + 10, "medium")
      createAsteroid(world, pos.x - 10, pos.y - 10, "medium")
    } else if (asteroid.size === "medium") {
      createAsteroid(world, pos.x + 5, pos.y + 5, "small")
      createAsteroid(world, pos.x - 5, pos.y - 5, "small")
    }

    world.removeEntity(asteroidEntity)
  }

  /**
   * Adds points to the global game score.
   *
   * @param world - The ECS world.
   * @param points - Number of points to add.
   */
  private addScore(world: World, points: number): void {
    const gameStates = world.query("GameState")
    if (gameStates.length > 0) {
      const gameState = world.getComponent<GameStateComponent>(gameStates[0], "GameState")
      if (gameState) {
        gameState.score += points
      }
    }
  }
}
