import { System, type World } from "../ecs-world"
import type {
  PositionComponent,
  ColliderComponent,
  AsteroidComponent,
  HealthComponent,
  GameStateComponent,
} from "../../types/GameTypes"

import { createAsteroid } from "../EntityFactory"

/**
 * CollisionSystem handles collision detection and response between entities.
 */
export class CollisionSystem extends System {
  update(world: World, deltaTime: number): void {
    const colliders = world.query("Position", "Collider")

    // Check all pairs
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


  private checkCollision(world: World, entityA: number, entityB: number): boolean {
    const posA = world.getComponent<PositionComponent>(entityA, "Position")
    const posB = world.getComponent<PositionComponent>(entityB, "Position")
    const colliderA = world.getComponent<ColliderComponent>(entityA, "Collider")
    const colliderB = world.getComponent<ColliderComponent>(entityB, "Collider")

    // Guard clauses: verificar que todos los componentes existen
    if (!posA || !posB || !colliderA || !colliderB) {
      return false
    }

    const dx = posA.x - posB.x
    const dy = posA.y - posB.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    return distance < colliderA.radius + colliderB.radius
  }

  private handleCollision(world: World, entityA: number, entityB: number): void {
    const asteroidA = world.getComponent(entityA, "Asteroid")
    const asteroidB = world.getComponent(entityB, "Asteroid")
    const healthA = world.getComponent<HealthComponent>(entityA, "Health")
    const healthB = world.getComponent<HealthComponent>(entityB, "Health")
    const ttlA = world.getComponent(entityA, "TTL")
    const ttlB = world.getComponent(entityB, "TTL")

    // Verificar que las entidades aún existen antes de procesar colisión
    const posA = world.getComponent<PositionComponent>(entityA, "Position")
    const posB = world.getComponent<PositionComponent>(entityB, "Position")
    
    if (!posA || !posB) {
      return // Una de las entidades fue eliminada por otro sistema
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

    // Ship hits asteroid - nave pierde vida, asteroide permanece
    if (healthA && asteroidB) {
      healthA.current--
      // NO eliminar asteroide - solo reduce vidas de la nave
    } else if (healthB && asteroidA) {
      healthB.current--
      // NO eliminar asteroide - solo reduce vidas de la nave
    }
  
  }

  private splitAsteroid(world: World, asteroidEntity: number): void {
    const asteroid = world.getComponent<AsteroidComponent>(asteroidEntity, "Asteroid")
    const pos = world.getComponent<PositionComponent>(asteroidEntity, "Position")

    // Guard clause: verificar componentes antes de usar
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
