import type { IGame, UpdateListener } from "../../../engine/core/IGame";
import type { World } from "../../../engine/core/World";
import type { GameStateComponent, InputState } from "./AsteroidTypes";

// Re-export with strong typing for Asteroids
export type { UpdateListener };

export interface IAsteroidsGame extends IGame<IAsteroidsGame> {
  isMultiplayer: boolean;
  // Override with specific types
  getGameState(): GameStateComponent;
  setInput(input: Partial<InputState>): void;
  isPausedState(): boolean;
  isGameOver(): boolean;
}

export interface IGameStateSystem {
  isGameOver(): boolean;
  resetGameOverState(world?: World): void;
}
