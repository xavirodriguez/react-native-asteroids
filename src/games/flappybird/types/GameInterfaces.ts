import { IGame } from "../../../engine/core/IGame";
import { FlappyBirdState, FlappyBirdInput } from "./FlappyBirdTypes";
import { Renderer } from "../../../engine/rendering/Renderer";

/**
 * Public interface for the Flappy Bird game controller.
 */
export interface IFlappyBirdGame extends IGame<IFlappyBirdGame> {
  getGameState(): FlappyBirdState;
  setInput(input: Partial<FlappyBirdInput>): void;
  isPausedState(): boolean;
  isGameOver(): boolean;
  initializeRenderer(renderer: Renderer): void;
}

/**
 * Interface for the Flappy Bird game state system.
 */
export interface IFlappyStateSystem {
  isGameOver(): boolean;
  resetGameOverState(): void;
}
