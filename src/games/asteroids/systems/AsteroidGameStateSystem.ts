import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import { type GameStateComponent, type HealthComponent, GAME_CONFIG } from "../../../types/GameTypes";
import { spawnAsteroidWave, createUfo } from "../EntityFactory";
import { getGameState } from "../GameUtils";
import { type IGameStateSystem, type IAsteroidsGame } from "../types/GameInterfaces";
import { randomService } from "../../../engine/utils/RandomService";

/**
 * System responsible for managing global game state, wave spawning, and game over conditions.
 */
export class AsteroidGameStateSystem extends System implements IGameStateSystem {
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

    this.updatePlayerStatus({ world, gameState, deltaTime });
    this.updateAsteroidsCount(world, gameState);
    this.manageWaveProgression(world, gameState);
    this.manageUfoSpawning(world, deltaTime);
    this.updateGameOverStatus(world, gameState);
  }

  private manageUfoSpawning(world: World, deltaTime: number): void {
    // 0.1% chance per second
    if (randomService.nextFloat() < 0.001 * (deltaTime / 1000)) {
      const ufos = world.query("Ufo");
      if (ufos.length === 0) {
        const x = randomService.nextBoolean(0.5) ? 0 : GAME_CONFIG.SCREEN_WIDTH;
        const y = 50 + randomService.nextFloat() * (GAME_CONFIG.SCREEN_HEIGHT - 100);
        createUfo(world, x, y);
      }
    }
  }

  public isGameOver(): boolean {
    return this.gameOverLogged;
  }

  public resetGameOverState(): void {
    this.gameOverLogged = false;
  }

  private updateAsteroidsCount(world: World, gameState: GameStateComponent): void {
    const asteroids = world.query("Asteroid");
    gameState.asteroidsRemaining = asteroids.length;
  }

  private manageWaveProgression(world: World, gameState: GameStateComponent): void {
    if (gameState.asteroidsRemaining === 0) {
      this.advanceLevelAndSpawnWave(world, gameState);
    }
  }

  private advanceLevelAndSpawnWave(world: World, gameState: GameStateComponent): void {
    const asteroidCount = this.calculateWaveCount(gameState.level);
    spawnAsteroidWave({ world, count: asteroidCount });
    gameState.level++;
  }

  private updatePlayerStatus(context: {
    world: World;
    gameState: GameStateComponent;
    deltaTime: number;
  }): void {
    const { world, gameState, deltaTime } = context;
    const ships = world.query("Ship", "Health", "Input");
    if (ships.length === 0) return;

    const shipEntity = ships[0];
    const health = world.getComponent<HealthComponent>(shipEntity, "Health");
    if (!health) return;

    this.updateInvulnerability(health, deltaTime);
    gameState.lives = health.current;
  }

  private updateInvulnerability(health: HealthComponent, deltaTime: number): void {
    if (health.invulnerableRemaining > 0) {
      health.invulnerableRemaining -= deltaTime;
    }
  }

  private updateGameOverStatus(world: World, gameState: GameStateComponent): void {
    const isGameOver = this.evaluateGameOverCondition(gameState);
    gameState.isGameOver = isGameOver;

    if (isGameOver) {
      this.handleGameOverOnce(gameState);
    } else {
      this.gameOverLogged = false;
    }
  }

  private evaluateGameOverCondition(gameState: GameStateComponent): boolean {
    return gameState.lives <= 0;
  }

  private handleGameOverOnce(gameState: GameStateComponent): void {
    void gameState;
    if (!this.gameOverLogged) {
      this.gameOverLogged = true;
      this.gameInstance?.pause();
    }
  }

  private calculateWaveCount(level: number): number {
    const initialCount = GAME_CONFIG.INITIAL_ASTEROID_COUNT;
    const maxCount = GAME_CONFIG.MAX_WAVE_ASTEROIDS;
    return Math.min(initialCount + level, maxCount);
  }
}
