import type { World } from "../../../engine/core/World";
import type { GameStateComponent, InputState } from "../../../types/GameTypes";
import type { AsteroidRenderSystem } from "../systems/AsteroidRenderSystem";

/**
 * Type definition for a callback function triggered on every game update.
 */
export type UpdateListener = (game: IAsteroidsGame) => void;

/**
 * Interface defining the public API for the Asteroids game controller.
 */
export interface IAsteroidsGame {
  pause(): void;
  resume(): void;
  restart(): void;
  getWorld(): World;
  isPausedState(): boolean;
  isGameOver(): boolean;
  getGameState(): GameStateComponent;
  setInput(input: Partial<InputState>): void;
  subscribe(listener: UpdateListener): () => void;
  destroy(): void;
  getRenderSystem(): AsteroidRenderSystem;
}

/**
 * Interface defining the public API for the Game State System.
 */
export interface IGameStateSystem {
  isGameOver(): boolean;
  resetGameOverState(): void;
}
