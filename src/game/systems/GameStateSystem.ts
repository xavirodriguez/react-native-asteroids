import { System, type World } from "../ecs-world"
import { type GameStateComponent, type HealthComponent, GAME_CONFIG } from "../../types/GameTypes"
import { spawnAsteroidWave } from "../EntityFactory"
import type { IAsteroidsGame } from "../AsteroidsGame"
import { getGameState } from "../GameUtils"

/**
 * System responsible for managing global game state, wave spawning, and game over conditions.
 */
export class GameStateSystem extends System {
  private gameOverLogged = false;
  private gameInstance: IAsteroidsGame | undefined;

  constructor(gameInstance?: IAsteroidsGame) {
    super();
    this.gameInstance = gameInstance;
  }

  /**
   * Updates the game state by processing various sub-tasks.
   */
  public update(world: World, deltaTime: number): void {
    const gameState = getGameState(world);

    this.updateAsteroidsCount(world, gameState);
    this.spawnWaveIfCleared(world, gameState);
    this.updatePlayerStatus({ world, gameState, deltaTime });
    this.checkGameOver(world, gameState);
  }

  public isGameOver(): boolean {
    return this.gameOverLogged;
  }

  public resetGameOverState(): void {
    console.log("Resetting game over state flag");
    this.gameOverLogged = false;
  }

  private updateAsteroidsCount(world: World, gameState: GameStateComponent): void {
    const asteroids = world.query("Asteroid");
    gameState.asteroidsRemaining = asteroids.length;
  }

  private spawnWaveIfCleared(world: World, gameState: GameStateComponent): void {
    if (gameState.asteroidsRemaining === 0) {
      const asteroidCount = this.calculateWaveCount(gameState.level)
      spawnAsteroidWave({ world, count: asteroidCount })
      gameState.level++
    }
  }

  private updatePlayerStatus(params: {
    world: World
    gameState: GameStateComponent
    deltaTime: number
  }): void {
    const { world, gameState, deltaTime } = params
    const ships = world.query("Health", "Input");
    if (ships.length === 0) return

    const shipEntity = ships[0]
    const health = world.getComponent<HealthComponent>(shipEntity, "Health")!

    this.updateInvulnerability(health, deltaTime)
    gameState.lives = health.current
  }

  private updateInvulnerability(health: HealthComponent, deltaTime: number): void {
    if (health.invulnerableRemaining > 0) {
      health.invulnerableRemaining -= deltaTime;
    }
  }

  private checkGameOver(world: World, gameState: GameStateComponent): void {
    const isGameOver = this.evaluateGameOverCondition(world)

    gameState.isGameOver = isGameOver
    if (isGameOver) {
      this.handleGameOverOnce(gameState)
      return
    }

    this.gameOverLogged = false
  }

  private evaluateGameOverCondition(world: World): boolean {
    const ships = world.query("Health", "Input");
    return ships.length > 0 && ships.every((ship) => {
      const health = world.getComponent<HealthComponent>(ship, "Health");
      return !health || health.current <= 0;
    });
  }

  private handleGameOverOnce(gameState: GameStateComponent): void {
    if (!this.gameOverLogged) {
      console.log(`Game Over! Final Score: ${gameState.score}`);
      this.gameOverLogged = true;
      this.gameInstance?.pause();
    }
  }

  private calculateWaveCount(level: number): number {
    const initialCount = GAME_CONFIG.INITIAL_ASTEROID_COUNT
    const maxCount = GAME_CONFIG.MAX_WAVE_ASTEROIDS
    return Math.min(initialCount + level, maxCount)
  }
}
