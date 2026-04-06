import { World } from "../../../engine/core/World";
import { GameStateComponent, InputState } from "./SpaceInvadersTypes";
import { Renderer } from "../../../engine/rendering/Renderer";

/**
 * Public interface for the Space Invaders game controller.
 */
export interface ISpaceInvadersGame {
  isMultiplayer: boolean;
  start(): void;
  stop(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  destroy(): void;
  getWorld(): World;
  isPausedState(): boolean;
  isGameOver(): boolean;
  getGameState(): GameStateComponent;
  setInput(input: Partial<InputState>): void;
  subscribe(callback: (game: ISpaceInvadersGame) => void): () => void;
  initializeRenderer(renderer: Renderer): void;
}
