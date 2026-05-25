import { World } from "../../../engine/core/World";
import { type GameStateComponent } from "../types/AsteroidTypes";
import { AsteroidConfig } from "../types/AsteroidConfigSchema";
import { HealthComponent } from "../../../engine/core/CoreComponents";
import { spawnAsteroidWave, createUfo } from "../EntityFactory";
import { type IGameStateSystem, type IAsteroidsGame } from "../types/GameInterfaces";
import { RandomService } from "../../../engine/utils/RandomService";
import { BaseGameStateSystem } from "../../../engine/systems/BaseGameStateSystem";

/**
 * System responsible for managing global game state, wave spawning, and game over conditions.
 */
export class AsteroidGameStateSystem extends BaseGameStateSystem<GameStateComponent> implements IGameStateSystem {
  private config?: AsteroidConfig;

  constructor(gameInstance?: IAsteroidsGame) {
    super(gameInstance as unknown as import("../../../engine/core/BaseGame").BaseGame<Record<string, unknown>, Record<string, unknown>>);
  }

  /**
   * Updates the game state by processing various sub-tasks.
   */
  protected updateGameState(world: World, gameState: GameStateComponent, deltaTime: number): void {
    if (!this.config) {
        this.config = world.getResource<AsteroidConfig>("GameConfig")!;
    }
    this.updateAsteroidsCount(world, gameState);
    this.manageWaveProgression(world, gameState);
    this.updatePlayerStatus({ world, gameState, deltaTime });
    this.manageUfoSpawning(world);
  }

  protected getGameState(world: World): GameStateComponent | undefined {
    return world.getSingleton<GameStateComponent>("GameState");
  }

  private manageUfoSpawning(world: World): void {
    if (!this.config) return;
    const gameplayRandom = world.gameplayRandom;
    if (world.query("Ufo").length === 0 && gameplayRandom.chance(this.config.UFO_SPAWN_CHANCE)) {
      createUfo({ world, deferred: true });
    }
  }

  private updateAsteroidsCount(world: World, _gameState: GameStateComponent): void {
    const asteroids = world.query("Asteroid");
    world.mutateSingleton<GameStateComponent>("GameState", (gs) => {
        gs.asteroidsRemaining = asteroids.length;
    });
  }

  private manageWaveProgression(world: World, gameState: GameStateComponent): void {
    if (gameState.asteroidsRemaining === 0) {
      this.advanceLevelAndSpawnWave(world, gameState);
    }
  }

  private advanceLevelAndSpawnWave(world: World, gameState: GameStateComponent): void {
    const asteroidCount = this.calculateWaveCount(gameState.level);
    spawnAsteroidWave({ world, count: asteroidCount });
    world.mutateSingleton<GameStateComponent>("GameState", (gs) => {
        gs.level++;
    });
    // Recount immediately so next step or subscriber sees updated count
    this.updateAsteroidsCount(world, gameState);
  }

  private updatePlayerStatus(context: {
    world: World;
    gameState: GameStateComponent;
    deltaTime: number;
  }): void {
    const { world, deltaTime } = context;
    const ships = world.query("Ship", "Health");
    if (ships.length === 0) return;

    const shipEntity = ships[0];
    const health = world.getComponent(shipEntity, "Health") as HealthComponent;
    if (!health) return;

    this.updateInvulnerability(deltaTime, world, shipEntity);
    world.mutateSingleton<GameStateComponent>("GameState", (gs) => {
        gs.lives = health.current;
    });
  }

  private updateInvulnerability(deltaTime: number, world: World, shipEntity: number): void {
    world.mutateComponent(shipEntity, "Health", (h: HealthComponent) => {
        if (h.invulnerableRemaining > 0) {
            h.invulnerableRemaining -= deltaTime;
        }
    });
  }

  protected evaluateGameOverCondition(gameState: GameStateComponent): boolean {
    return gameState.lives <= 0;
  }

  private calculateWaveCount(level: number): number {
    if (!this.config) return 0;
    const initialCount = this.config.INITIAL_ASTEROID_COUNT;
    const maxCount = this.config.MAX_WAVE_ASTEROIDS;
    return Math.min(initialCount + level, maxCount);
  }

  public override resetGameOverState(world?: World): void {
    const w = world || this._world;
    if (w) {
      w.mutateSingleton<GameStateComponent>("GameState", (gs) => {
        gs.isGameOver = false;
        gs.gameOverLogged = false;
      });
    }
  }
}
