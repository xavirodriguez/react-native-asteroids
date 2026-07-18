import { IGame } from "../../../index";
import { GameStateComponent, InputState } from "./SpaceInvadersTypes";
import { Renderer } from "../../../index";

/**
 * Public interface for the Space Invaders game controller.
 */
export interface ISpaceInvadersGame extends IGame<GameStateComponent> {
  gameId: string;
  isMultiplayer: boolean;
  getGameState(): GameStateComponent;
  setInput(input: Partial<InputState>): void;
  isPausedState(): boolean;
  isGameOver(): boolean;
  initializeRenderer(renderer: Renderer): void;
}
