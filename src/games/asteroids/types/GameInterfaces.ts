import type { IGame, UpdateListener } from "@tiny-aster/core";
import type { World } from "@tiny-aster/core";
import type { GameStateComponent } from "./AsteroidTypes";

// Re-export with strong typing for Asteroids
export type { UpdateListener };

export interface IAsteroidsGame extends IGame<IAsteroidsGame> {
  isMultiplayer: boolean;
  // Override with specific types
  getGameState(): GameStateComponent;
  isPausedState(): boolean;
  isGameOver(): boolean;
}

export interface IGameStateSystem {
  isGameOver(): boolean;
  resetGameOverState(world?: World): void;
}
