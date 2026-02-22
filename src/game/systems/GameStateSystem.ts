import { System, type World } from "../ecs-world"
import { type GameStateComponent, type HealthComponent, GAME_CONFIG } from "../../types/GameTypes"
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
    const status = this.gameOverLogged;
    return status;
  }

  public resetGameOverState(): void {
    console.log("Resetting game over state flag");
    this.gameOverLogged = false;
  }

  private getGameState(world: World): GameStateComponent | undefined {
    const gameStates = world.query("GameState");
    if (gameStates.length === 0) {
      return undefined;
    }

    const component = world.getComponent<GameStateComponent>(gameStates[0], "GameState");
    return component;
  }

  private updateAsteroidsCount(world: World, gameState: GameStateComponent): void {
    const asteroids = world.query("Asteroid");
    const count = asteroids.length;
    gameState.asteroidsRemaining = count;
  }

  private spawnWaveIfCleared(world: World, gameState: GameStateComponent): void {
    const isCleared = gameState.asteroidsRemaining === 0;
    if (isCleared) {
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
    const currentInvulnerable = health.invulnerableRemaining;
    if (currentInvulnerable > 0) {
      health.invulnerableRemaining = currentInvulnerable - deltaTime;
    }
  }

  private checkGameOver(world: World, gameState: GameStateComponent): void {
    const ships = world.query("Health", "Input");
    const isDead = ships.length > 0 && ships.every((ship) => {
      const health = world.getComponent<HealthComponent>(ship, "Health");
      return health ? health.current <= 0 : true;
    });

    gameState.isGameOver = isDead;
    if (isDead) {
      this.handleGameOver(gameState);
    } else {
      this.gameOverLogged = false;
    }
  }

  private handleGameOver(gameState: GameStateComponent): void {
    if (!this.gameOverLogged) {
      const finalScore = gameState.score;
      console.log(`Game Over! Final Score: ${finalScore}`);
      this.gameOverLogged = true;

      if (this.gameInstance) {
        this.gameInstance.pause();
      }
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
