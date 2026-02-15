import { System, type World } from "../ecs-world"
import type { GameStateComponent, HealthComponent } from "../../types/GameTypes"
import { createAsteroid } from "../EntityFactory"
import type { IAsteroidsGame } from "../AsteroidsGame"

/**
 * System responsible for managing global game state, wave spawning, and game over conditions.
 *
 * @remarks
 * This system monitors the number of asteroids in the world and spawns new waves when
 * they are all destroyed. It also monitors player health to detect game over states.
 * It interacts with the main game instance to pause the game when the player loses.
 */
export class GameStateSystem extends System {
  /** Flag to prevent multiple game over logs and actions. */
  private gameOverLogged = false

  /**
   * Reference to the main game instance for triggering high-level actions.
   */
  private gameInstance: IAsteroidsGame | undefined

  /**
   * Creates a new GameStateSystem.
   *
   * @param gameInstance - Optional reference to the main game instance.
   */
  constructor(gameInstance?: IAsteroidsGame) {
    super()
    this.gameInstance = gameInstance
  }

  /**
   * Updates the game state, checks for wave completion and game over.
   *
   * @param world - The ECS world.
   * @param _deltaTime - Time since last frame in milliseconds.
   */
  update(world: World, _deltaTime: number): void {
    void _deltaTime;
    const gameStates = world.query("GameState")

    if (gameStates.length === 0) return

    const gameEntity = gameStates[0]
    const gameState = world.getComponent<GameStateComponent>(gameEntity, "GameState")!

    // Count remaining asteroids
    const asteroids = world.query("Asteroid")
    gameState.asteroidsRemaining = asteroids.length

    // Spawn new wave if no asteroids remain
    if (gameState.asteroidsRemaining === 0) {
      this.spawnAsteroidWave(world, gameState.level)
      gameState.level++
    }

    // Check game over
    const ships = world.query("Health", "Input")
    const shipHealths = ships.map((ship) => world.getComponent<HealthComponent>(ship, "Health")!.current)

    if (shipHealths.every((health) => health <= 0)) {
      if (!this.gameOverLogged) {
        console.log(`Game Over! Score: ${gameState.score}`)
        console.log("Press 'R' to restart or call game.restart()")
        this.gameOverLogged = true
        
        // Pause the game automatically via the game instance reference
        if (this.gameInstance) {
          this.gameInstance.pause()
        }
      }
    } else {
      // Reset flag if the ship gains health (e.g., after a restart)
      this.gameOverLogged = false
    }
  }

  /**
   * Checks if the game is currently in a game over state.
   *
   * @returns `true` if game over, `false` otherwise.
   */
  isGameOver(): boolean {
    return this.gameOverLogged
  }

  /**
   * Resets the game over state flag.
   */
  resetGameOverState(): void {
    this.gameOverLogged = false
  }

  /**
   * Spawns a new wave of asteroids based on the current level.
   *
   * @param world - The ECS world.
   * @param level - The current game level.
   *
   * @remarks
   * The number of asteroids increases with the level, capped at 12.
   * Asteroids are spawned in a circular pattern around the center.
   */
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
