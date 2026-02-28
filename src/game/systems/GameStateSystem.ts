import { System, type World } from "../ecs-world"
import { type GameStateComponent, type HealthComponent, GAME_CONFIG, INITIAL_GAME_STATE } from "../../types/GameTypes"
import { createAsteroid } from "../EntityFactory"
import type { IAsteroidsGame } from "../AsteroidsGame"

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
    const gameState = this.getGameState(world);
    if (!gameState) {
      return;
    }

    this.updateAsteroidsCount(world, gameState);
    this.spawnWaveIfCleared(world, gameState);
    this.updatePlayerStatus(world, gameState, deltaTime);
    this.checkGameOver(world, gameState);
  }

  public isGameOver(): boolean {
    return this.gameOverLogged;
  }

  public resetGameOverState(): void {
    console.log("Resetting game over state flag");
    this.gameOverLogged = false;
  }

  private getGameState(world: World): GameStateComponent {
    const gameStates = world.query("GameState");
    if (gameStates.length === 0) {
      return INITIAL_GAME_STATE;
    }

    const component = world.getComponent<GameStateComponent>(gameStates[0], "GameState");
    return component || INITIAL_GAME_STATE;
  }

  private updateAsteroidsCount(world: World, gameState: GameStateComponent): void {
    const asteroids = world.query("Asteroid");
    gameState.asteroidsRemaining = asteroids.length;
  }

  private spawnWaveIfCleared(world: World, gameState: GameStateComponent): void {
    if (gameState.asteroidsRemaining === 0) {
      this.spawnAsteroidWave(world, gameState.level);
      gameState.level++;
    }
  }

  private updatePlayerStatus(world: World, gameState: GameStateComponent, deltaTime: number): void {
    const ships = world.query("Health", "Input");
    if (ships.length === 0) {
      return;
    }

    const shipEntity = ships[0];
    const health = world.getComponent<HealthComponent>(shipEntity, "Health")!;

    this.updateInvulnerability(health, deltaTime);
    gameState.lives = health.current;
  }

  private updateInvulnerability(health: HealthComponent, deltaTime: number): void {
    if (health.invulnerableRemaining > 0) {
      health.invulnerableRemaining -= deltaTime;
    }
  }

  private checkGameOver(world: World, gameState: GameStateComponent): void {
    const isGameOver = this.evaluateGameOverCondition(world);

    gameState.isGameOver = isGameOver;
    if (isGameOver) {
      this.handleGameOverOnce(gameState);
      return;
    }

    this.gameOverLogged = false;
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

  /**
   * Spawns a new wave of asteroids based on the current level.
   */
  private spawnAsteroidWave(world: World, level: number): void {
    const initialCount = GAME_CONFIG.INITIAL_ASTEROID_COUNT;
    const maxCount = GAME_CONFIG.MAX_WAVE_ASTEROIDS;
    const asteroidCount = Math.min(initialCount + level, maxCount);

    const centerX = GAME_CONFIG.SCREEN_CENTER_X;
    const centerY = GAME_CONFIG.SCREEN_CENTER_Y;
    const distance = GAME_CONFIG.WAVE_SPAWN_DISTANCE;

    for (let i = 0; i < asteroidCount; i++) {
      const angle = (Math.PI * 2 * i) / asteroidCount;
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;
      createAsteroid(world, x, y, "large");
    }
  }
}
