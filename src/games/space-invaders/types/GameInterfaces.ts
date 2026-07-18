import { IGame } from "@tiny-aster/core";
import { GameStateComponent, InputState } from "./SpaceInvadersTypes";
import { Renderer } from "@tiny-aster/core";

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
