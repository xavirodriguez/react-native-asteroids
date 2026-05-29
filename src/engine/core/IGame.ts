import type { World } from "./World";
import type { GameLoop } from "./GameLoop";

/**
 * Generic type for game update subscribers.
 * Receives the current game state to maintain the principle of least privilege.
 *
 * @typeParam TState - The type of the serializable game state.
 */
export type UpdateListener<TState> = (state: TState) => void;

/**
 * Fundamental generic interface for game implementations.
 * Defines lifecycle and communication expectations between the engine and the presentation layer.
 *
 * @responsibility Define the lifecycle contract (start, stop, pause, destroy).
 * @responsibility Provide access to world state and completion logic.
 * @responsibility Act as a unified sink for user inputs (programmatic or UI).
 *
 * @remarks
 * This interface allows React components or external systems to interact with any game
 * in a unified way, facilitating scene swapping and multiplayer integration.
 *
 * @typeParam _TGame - El tipo concreto de la clase de juego que implementa la interfaz.
 *
 * @conceptualRisk [ASYNC_LIFECYCLE] `restart` may be asynchronous. Rapid, successive calls
 * could lead to inconsistent states if the game does not handle transition locks.
 */
export interface IGame<_TGame = unknown, TState = unknown> {
  /**
   * Starts the game loop execution.
   * @remarks Expected to invoke `GameLoop.start()`.
   */
  start(): void;

  /**
   * Stops execution and rendering.
   * @remarks Expected to invoke `GameLoop.stop()`.
   */
  stop(): void;

  /**
   * Requests to pause logical simulation while maintaining current state.
   * @remarks Simulation systems are expected to ignore the tick if `isPausedState()` is true.
   */
  pause(): void;

  /**
   * Reanuda la simulación desde un estado pausado.
   */
  resume(): void;

  /**
   * Restarts the game to its initial state. May be asynchronous if loading resources.
   * @param seed - Optional seed to initialize the random number generator.
   *
   * @remarks
   * The game is expected to perform cleanup of the previous {@link World} before re-initialization.
   */
  restart(seed?: number): void | Promise<void>;

  /**
   * Releases resources and disconnects listeners; recommended to be called upon unmounting the game.
   * @remarks Once destroyed, the behavior of calling `start()` or `update()` is implementation-dependent.
   */
  destroy(): void;

  /**
   * Retrieves the current {@link World} (ECS) instance.
   * @queries Current state of all entities and components.
   */
  getWorld(): World;

  /**
   * Indica si el juego se encuentra en estado de pausa.
   */
  isPausedState(): boolean;

  /**
   * Indica si se ha alcanzado una condición terminal de fin de juego.
   */
  isGameOver(): boolean;

  /**
   * Subscribes a listener to be notified after each logical update.
   * @param listener - Callback receiving the game state.
   * @returns Unsubscribe function.
   */
  subscribe(listener: UpdateListener<TState>): () => void;

  /**
   * Obtiene la instancia del {@link GameLoop} asociada.
   */
  getGameLoop(): GameLoop;

  /**
   * Attempts to retrieve a snapshot of the current game state.
   * Each implementation should override the return type with its specific state.
   *
   * @remarks
   * For network/rollback support, the returned object should be serializable (no functions
   * or circular references).
   *
   * @returns The captured serializable state.
   */
  getGameState(): unknown;

  /**
   * Returns the current gameplay seed.
   * @remarks Expected to match the seed used to initialize the 'gameplay' RandomService.
   */
  getSeed(): number;

  /**
   * Registers game-specific rendering logic to the provided renderer.
   */
  initializeRenderer(renderer: import("../rendering/Renderer").Renderer<unknown>): void;
}
