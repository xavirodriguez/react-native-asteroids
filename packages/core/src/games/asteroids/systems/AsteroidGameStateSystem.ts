import { World } from "../../../ecs/World";
import { BaseGameStateSystem } from "../../../systems/BaseGameStateSystem";
import { GameStateComponent } from "../types/AsteroidTypes";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../types/AsteroidRegistry";
import { IAsteroidsGame } from "../types/GameInterfaces";
import { spawnAsteroidWave } from "../EntityFactory";

/** @public */
export class AsteroidGameStateSystem extends BaseGameStateSystem<
  GameStateComponent,
  AsteroidsComponentRegistry,
  AsteroidsEventRegistry
> {
  private game: IAsteroidsGame;

  constructor(game: IAsteroidsGame) {
    super("GameState");
    this.game = game;
  }

  protected getGameState(world: World<AsteroidsComponentRegistry>): GameStateComponent | undefined {
    return world.getSingleton("GameState");
  }

  protected updateGameState(
    world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>,
    gameState: GameStateComponent,
    deltaTime: number
  ): void {
      if (gameState.isGameOver) return;

      // Check if all asteroids are destroyed
      const asteroids = world.query("Asteroid");
      if (asteroids.length === 0) {
          // All asteroids cleared! Increment level and spawn the next wave
          let nextLevel = gameState.level;
          world.mutateSingleton("GameState", (gs) => {
              gs.level++;
              nextLevel = gs.level;
          });

          spawnAsteroidWave(world as any, nextLevel);
      }
  }

  protected evaluateGameOverCondition(gameState: GameStateComponent): boolean {
    return gameState.lives <= 0;
  }

  public update(world: World<AsteroidsComponentRegistry>, deltaTime: number): void {
      super.update(world, deltaTime);
  }

  public isGameOver(): boolean {
      const state = this.game.getGameState();
      return state.isGameOver;
  }

  public resetGameOverState(world: World<AsteroidsComponentRegistry>): void {
      world.mutateSingleton("GameState", (state) => {
          state.isGameOver = false;
          state.lives = 3;
          state.score = 0;
          state.level = 1;
      });
  }
}
