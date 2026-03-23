import { World } from "./core/World";
import { GameLoop } from "./core/GameLoop";
import { InputManager } from "./input/InputManager";
import { EventBus } from "./utils/EventBus";
import { InputState } from "../types/GameTypes";

export type GameUpdateListener<T extends BaseGame> = (game: T) => void;
export type Unsubscribe = () => void;

/**
 * Abstract base class for all games implemented with this engine.
 * Provides standard lifecycle methods and core engine service access.
 */
export abstract class BaseGame {
  protected world: World;
  protected gameLoop: GameLoop;
  protected inputManager: InputManager;
  protected eventBus: EventBus;
  protected listeners = new Set<GameUpdateListener<any>>();

  private _isPaused = false;

  constructor() {
    this.world = new World();
    this.gameLoop = new GameLoop(this.world);
    this.inputManager = new InputManager();
    this.eventBus = new EventBus();

    this.gameLoop.subscribeRender(() => this.notifyListeners());
  }

  /**
   * Called by the constructor to register game-specific systems.
   */
  protected abstract registerSystems(): void;

  /**
   * Called to initialize the game entities (e.g., player, enemies, initial state).
   */
  protected abstract initializeEntities(): void;

  /**
   * Starts the game loop.
   */
  public start(): void {
    this._isPaused = false;
    this.gameLoop.start();
  }

  /**
   * Stops the game loop.
   */
  public stop(): void {
    this.gameLoop.stop();
  }

  /**
   * Pauses the game logic updates.
   */
  public pause(): void {
    this._isPaused = true;
    this.notifyListeners();
  }

  /**
   * Resumes the game logic updates.
   */
  public resume(): void {
    this._isPaused = false;
    this.notifyListeners();
  }

  /**
   * Restarts the game by clearing the world and re-initializing entities.
   */
  public restart(): void {
    this.world.clear();
    this.initializeEntities();
    this._isPaused = false;
  }

  /**
   * Destroys the game instance and cleans up resources.
   */
  public destroy(): void {
    this.stop();
    this.inputManager.cleanup();
    this.eventBus.clear();
    this.listeners.clear();
  }

  /**
   * Subscribes a listener to game updates (triggered every frame).
   */
  public subscribe(listener: GameUpdateListener<this>): Unsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Updates the input state of the game.
   */
  public setInput(input: Partial<InputState>): void {
    if (!this._isPaused) {
      this.inputManager.setInputs(input);
    }
  }

  /**
   * Returns the ECS world instance.
   */
  public getWorld(): World {
    return this.world;
  }

  /**
   * Returns whether the game is currently paused.
   */
  public isPausedState(): boolean {
    return this._isPaused;
  }

  protected notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this));
  }

  /**
   * Allows systems to check pause state during their update if needed,
   * though typically handled by the game loop or the system's own logic.
   */
  protected isPaused(): boolean {
    return this._isPaused;
  }
}
