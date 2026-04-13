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
export declare abstract class BaseGameStateSystem<TState extends IGameState> extends System {
    protected gameOverLogged: boolean;
    protected gameInstance: BaseGame<any, any> | undefined;
    protected _world: World | undefined;
    constructor(gameInstance?: BaseGame<any, any>);
    /**
     * Updates the game state by checking the game over condition.
     */
    update(world: World, deltaTime: number): void;
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
    private handleGameOverStatus;
    isGameOver(world?: World): boolean;
    resetGameOverState(world?: World): void;
}
