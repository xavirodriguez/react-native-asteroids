import { System } from "../core/System";
import { World } from "../core/World";
import { BaseGame } from "../core/BaseGame";

/**
 * Interface for components that represent a generic game state.
 */
export interface IGameState {
  isGameOver: boolean;
}

/**
 * Abstract base system for managing game state.
 * Standardizes how Game Over is detected and reported.
 *
 * @template TState - The type of the game state component.
 */
export abstract class BaseGameStateSystem<TState extends IGameState> extends System {
  protected gameOverLogged = false;
  protected gameInstance: BaseGame<any, any> | undefined;

  constructor(gameInstance?: BaseGame<any, any>) {
    super();
    this.gameInstance = gameInstance;
  }

  /**
   * Updates the game state by checking the game over condition.
   */
  public update(world: World, deltaTime: number): void {
    const state = this.getGameState(world);
    if (!state) return;

    this.updateGameState(world, state, deltaTime);
    this.handleGameOverStatus(state);
  }

  /**
   * Implement specific game logic to update the state.
   */
  protected abstract updateGameState(world: World, state: TState, deltaTime: number): void;

  /**
   * Retrieves the current game state component from the world.
   */
  protected abstract getGameState(world: World): TState | undefined;

  /**
   * Evaluates if the game over condition is met.
   */
  protected abstract evaluateGameOverCondition(state: TState): boolean;

  private handleGameOverStatus(state: TState): void {
    const isGameOver = this.evaluateGameOverCondition(state);
    state.isGameOver = isGameOver;

    if (isGameOver) {
      if (!this.gameOverLogged) {
        this.gameOverLogged = true;
        this.gameInstance?.pause();
      }
    } else {
      this.gameOverLogged = false;
    }
  }

  public isGameOver(): boolean {
    return this.gameOverLogged;
  }

  public resetGameOverState(): void {
    this.gameOverLogged = false;
  }
}
