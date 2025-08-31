import { System, type World } from "../ecs-world"
import type { GameStateComponent, HealthComponent } from "../../types/GameTypes"
import { createAsteroid } from "../EntityFactory"

export class GameStateSystem extends System {
  update(world: World, deltaTime: number): void {
    const gameStates = world.query("GameState")

    if (gameStates.length === 0) return

    const gameEntity = gameStates[0]
    const gameState = world.getComponent<GameStateComponent>(gameEntity, "GameState")!

    // Count remaining asteroids
    const asteroids = world.query("Asteroid")
    gameState.asteroidsRemaining = asteroids.length

    // Spawn new wave if no asteroids
    if (gameState.asteroidsRemaining === 0) {
      this.spawnAsteroidWave(world, gameState.level)
      gameState.level++
    }

    // Check game over
    const ships = world.query("Health", "Input")
    const shipHealths = ships.map((ship) => world.getComponent<HealthComponent>(ship, "Health")!.current)

if (shipHealths.every((health) => health <= 0)) {
  console.log(`Game Over! Score: ${gameState.score}`)  // Se ejecuta cada frame!
  // Could emit game over event here
}
  }

  private spawnAsteroidWave(world: World, level: number): void {
    const asteroidCount = Math.min(4 + level, 12)

    for (let i = 0; i < asteroidCount; i++) {
      const angle = (Math.PI * 2 * i) / asteroidCount
      const distance = 200
      const x = 400 + Math.cos(angle) * distance
      const y = 300 + Math.sin(angle) * distance

      createAsteroid(world, x, y, "large")
    }
  }
}
