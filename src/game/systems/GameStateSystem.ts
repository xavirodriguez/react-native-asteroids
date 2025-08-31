import { System, type World } from "../ecs-world"
import type { GameStateComponent, HealthComponent } from "../../types/GameTypes"
import { createAsteroid } from "../EntityFactory"

export class GameStateSystem extends System {
  private gameOverLogged = false
  private gameInstance: any // Referencia al AsteroidsGame

  constructor(gameInstance?: any) {
    super()
    this.gameInstance = gameInstance
  }

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

    // Check game over - pausar juego cuando termine
    const ships = world.query("Health", "Input")
    const shipHealths = ships.map((ship) => world.getComponent<HealthComponent>(ship, "Health")!.current)

    if (shipHealths.every((health) => health <= 0)) {
      if (!this.gameOverLogged) {
        console.log(`Game Over! Score: ${gameState.score}`)
        console.log("Press 'R' to restart or call game.restart()")
        this.gameOverLogged = true
        
        // Pausar el juego automáticamente
        if (this.gameInstance?.pause) {
          this.gameInstance.pause()
        }
      }
    } else {
      // Reset flag si la nave vuelve a tener vida
      this.gameOverLogged = false
    }
  }

  // Método público para verificar game over
  isGameOver(): boolean {
    return this.gameOverLogged
  }

  // Método para resetear estado de game over
  resetGameOverState(): void {
    this.gameOverLogged = false
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