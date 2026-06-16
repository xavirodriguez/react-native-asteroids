import { World, BaseGameStateSystem } from "@tiny-aster/core";
import { GameStateComponent } from "../types/AsteroidTypes";
import { AsteroidsComponentRegistry } from "../types/AsteroidRegistry";
import { IAsteroidsGame } from "../types/GameInterfaces";

export class AsteroidGameStateSystem extends BaseGameStateSystem<GameStateComponent, AsteroidsComponentRegistry> {
  constructor(game: IAsteroidsGame) {
    super(game as any);
  }

  protected getGameState(world: World<AsteroidsComponentRegistry>): GameStateComponent | undefined {
    return world.getSingleton("GameState");
  }

  protected updateGameState(world: World<AsteroidsComponentRegistry>, gameState: GameStateComponent, deltaTime: number): void {
      // Logic for wave management, score, etc.
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
      world.mutateSingleton("GameState", (state: any) => {
          state.isGameOver = false;
          state.lives = 3;
          state.score = 0;
          state.level = 1;
      });
  }
}
