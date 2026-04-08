import type { World } from "./World";
import type { GameLoop } from "./GameLoop";

/**
 * Generic type for the update listener.
 * TGame is the concrete game type (for strong typing in subscribers).
 */
export type UpdateListener<TGame> = (game: TGame) => void;

/**
 * Generic interface that EVERY game must implement.
 * TGame = the concrete game type (for strong typing in subscribe).
 */
export interface IGame<TGame = unknown> {
  start(): void;
  stop(): void;
  pause(): void;
  resume(): void;
  restart(): void | Promise<void>;
  destroy(): void;
  getWorld(): World;
  isPausedState(): boolean;
  isGameOver(): boolean;
  setInput(input: Record<string, boolean>): void;
  subscribe(listener: UpdateListener<TGame>): () => void;
  getGameLoop(): GameLoop;
  /**
   * Returns the current game state.
   * Overridden by each game with its specific type.
   */
  getGameState(): unknown;
}
