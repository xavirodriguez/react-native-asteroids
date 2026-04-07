import { World } from "../../../engine/core/World";
import { type GameStateComponent, type HealthComponent, GAME_CONFIG, INITIAL_GAME_STATE } from "../../../types/GameTypes";
import { spawnAsteroidWave, createUfo } from "../EntityFactory";
import { type IGameStateSystem, type IAsteroidsGame } from "../types/GameInterfaces";
import { RandomService } from "../../../engine/utils/RandomService";
import { BaseGameStateSystem } from "../../../engine/systems/BaseGameStateSystem";

/**
 * System responsible for managing global game state, wave spawning, and game over conditions.
 */
export class AsteroidGameStateSystem extends BaseGameStateSystem<GameStateComponent> implements IGameStateSystem {

  constructor(gameInstance?: IAsteroidsGame) {
    super(gameInstance as any);
  }

  /**
   * Updates the game state by processing various sub-tasks.
   */
  protected updateGameState(world: World, gameState: GameStateComponent, deltaTime: number): void {
    this.updatePlayerStatus({ world, gameState, deltaTime });
    this.updateAsteroidsCount(world, gameState);
    this.manageWaveProgression(world, gameState);
    this.manageUfoSpawning(world, deltaTime);
  }

  protected getGameState(world: World): GameStateComponent | undefined {
    return world.getSingleton<GameStateComponent>("GameState");
  }

  private manageUfoSpawning(world: World, deltaTime: number): void {
    if (RandomService.chance(0.001 * (deltaTime / 1000))) {
      this.trySpawnUfo(world);
    }
  }

  private trySpawnUfo(world: World): void {
    const ufos = world.query("Ufo");
    if (ufos.length === 0) {
      const x = RandomService.chance(0.5) ? 0 : GAME_CONFIG.SCREEN_WIDTH;
      const y = RandomService.nextRange(50, GAME_CONFIG.SCREEN_HEIGHT - 50);
      createUfo(world, x, y);
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

  protected evaluateGameOverCondition(gameState: GameStateComponent): boolean {
    return gameState.lives <= 0;
  }

  private calculateWaveCount(level: number): number {
    const initialCount = GAME_CONFIG.INITIAL_ASTEROID_COUNT;
    const maxCount = GAME_CONFIG.MAX_WAVE_ASTEROIDS;
    return Math.min(initialCount + level, maxCount);
  }
}
