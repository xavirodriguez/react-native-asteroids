import { System } from "../core/System";
import { World } from "../core/World";
import { BaseGame } from "../core/BaseGame";

/**
 * Interface for components that represent a generic game state.
 */
export interface IGameState {
  isGameOver: boolean;
  gameOverLogged?: boolean;
}

/**
 * Abstract base system for managing game state.
 * Standardizes how Game Over is detected and reported.
 *
 * @template TState - The type of the game state component.
 */
export abstract class BaseGameStateSystem<TState extends IGameState> extends System {
  protected gameOverLogged = false;
  protected gameInstance: BaseGame<Record<string, any>, any> | undefined;
  protected _world: World | undefined;

  constructor(gameInstance?: BaseGame<Record<string, any>, any>) {
    super();
    this.gameInstance = gameInstance;
  }

  /**
   * Updates the game state by checking the game over condition.
   */
  public update(world: World, deltaTime: number): void {
    this._world = world;
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
      if (state.gameOverLogged !== true) {
        state.gameOverLogged = true;
        this.gameInstance?.pause();
      }
    } else {
      state.gameOverLogged = false;
    }
  }

  public isGameOver(world?: World): boolean {
    const w = world || this._world;
    if (w) {
        const state = this.getGameState(w);
        return state?.gameOverLogged || false;
    }
    return false;
  }

  public resetGameOverState(world?: World): void {
    const w = world || this._world;
    if (w) {
        const state = this.getGameState(w);
        if (state) {
            state.gameOverLogged = false;
            state.isGameOver = false;
        }
    }
  }
}
