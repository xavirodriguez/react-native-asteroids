import { World, HealthComponent, BaseGameStateSystem } from "@tiny-aster/core";
import { GameStateComponent, InputState } from "../types/AsteroidTypes";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../types/AsteroidRegistry";
import { AsteroidConfig } from "../types/AsteroidConfigSchema";
import { BulletPool, ParticlePool } from "../EntityPool";
import { IAsteroidsGame } from "../types/GameInterfaces";

export class AsteroidGameStateSystem extends BaseGameStateSystem<GameStateComponent, InputState, AsteroidsComponentRegistry, AsteroidsEventRegistry> {
  private game: IAsteroidsGame;

  constructor(game: IAsteroidsGame) {
    super();
    this.game = game;
  }

  public update(world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>, deltaTime: number): void {
      // Logic for wave management, score, etc.
  }

  public onRegister(world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>): void {}
  public dispose(): void {}

  public isGameOver(): boolean {
      const state = this.game.getGameState();
      return state.isGameOver;
  }

  public resetGameOverState(world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>): void {
      world.mutateSingleton("GameState" as any, (state: any) => {
          state.isGameOver = false;
          state.lives = 3;
          state.score = 0;
          state.level = 1;
      });
  }
}
