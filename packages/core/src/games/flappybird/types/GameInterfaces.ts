import { IGame } from "../../../index";
import { FlappyBirdState, FlappyBirdInput } from "./FlappyBirdTypes";
import { Renderer } from "../../../index";

/**
 * Public interface for the Flappy Bird game controller.
 */
export interface IFlappyBirdGame extends IGame<FlappyBirdState> {
  isMultiplayer: boolean;
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
