import { IGame } from "../../../engine/IGame";
import { GameStateComponent, InputState } from "./SpaceInvadersTypes";
import { Renderer } from "../../../engine/presentation";

/**
 * Public interface for the Space Invaders game controller.
 */
export interface ISpaceInvadersGame extends IGame<ISpaceInvadersGame> {
  isMultiplayer: boolean;
  getGameState(): GameStateComponent;
  setInput(input: Partial<InputState>): void;
  isPausedState(): boolean;
  isGameOver(): boolean;
  initializeRenderer(renderer: Renderer): void;
}
