import { World } from "./World";
import { GameLoop } from "./GameLoop";
import { InputManager } from "../input/InputManager";
import type { IGame, UpdateListener } from "./IGame";

export interface BaseGameConfig {
  pauseKey?: string;    // Key code for pausing, e.g., "KeyP"
  restartKey?: string;  // Key code for restarting, e.g., "KeyR"
}

/**
 * Abstract base class for all games.
 * Provides boilerplate for lifecycle management, input, and listeners.
 */
export abstract class BaseGame<TState, TInput extends Record<string, boolean>>
  implements IGame<BaseGame<TState, TInput>> {

  protected world: World;
  protected gameLoop: GameLoop;
  protected inputManager: InputManager<TInput>;

  private _isPaused = false;
  private _listeners = new Set<UpdateListener<BaseGame<TState, TInput>>>();
  private _globalKeyHandler = (e: KeyboardEvent) => this._handleGlobalKey(e);
  private _config: BaseGameConfig;

  constructor(config: BaseGameConfig = {}) {
    this.world = new World();
    this.gameLoop = new GameLoop(this.world);
    this.inputManager = new InputManager<TInput>();

    this._config = config;

    // Register systems and initial entities - responsibility of the concrete game
    this.registerSystems();
    this.initializeEntities();

    // Notify React on each logical update frame
    this.gameLoop.subscribeUpdate(() => {
      if (!this._isPaused) this._notifyListeners();
    });

    this._registerKeyboardListeners();
  }

  // ─── Abstract methods — REQUIRED for each game ───────────────────────────

  /** Registers the game's ECS systems in this.world */
  protected abstract registerSystems(): void;

  /** Creates the initial game entities in this.world */
  protected abstract initializeEntities(): void;

  /** Returns the current game state (score, lives, level, etc.) */
  public abstract getGameState(): TState;

  /** Returns whether the game is in a game over state */
  public abstract isGameOver(): boolean;

  // ─── Final methods — DO NOT override in concrete games ───────────────────

  public start(): void {
    this.gameLoop.start();
  }

  public stop(): void {
    this.gameLoop.stop();
  }

  public pause(): void {
    if (this._isPaused) return;
    this._isPaused = true;
    this._notifyListeners();
  }

  public resume(): void {
    if (!this._isPaused) return;
    this._isPaused = false;
    this._notifyListeners();
  }

  public restart(): void {
    this.world.clear();
    this._onBeforeRestart();
    this.initializeEntities();
    if (this._isPaused) this.resume();
    this._notifyListeners();
  }

  public destroy(): void {
    this.stop();
    this.inputManager.cleanup();
    this._unregisterKeyboardListeners();
    this._listeners.clear();
  }

  public getWorld(): World {
    return this.world;
  }

  public isPausedState(): boolean {
    return this._isPaused;
  }

  public setInput(input: Partial<TInput>): void {
    if (this._isPaused || this.isGameOver()) return;
    this.inputManager.setInputs(input);
  }

  public subscribe(listener: UpdateListener<BaseGame<TState, TInput>>): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  // ─── Optional hook — can be overridden ───────────────────────────────────

  /**
   * Called during restart() before initializeEntities().
   * Useful for resetting internal game state (e.g., gameOverLogged = false).
   */
  protected _onBeforeRestart(): void {}

  // ─── Engine-internal methods ─────────────────────────────────────────────

  private _notifyListeners(): void {
    this._listeners.forEach(l => l(this));
  }

  private _registerKeyboardListeners(): void {
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") return;
    window.addEventListener("keydown", this._globalKeyHandler);
  }

  private _unregisterKeyboardListeners(): void {
    if (typeof window === "undefined" || typeof window.removeEventListener !== "function") return;
    window.removeEventListener("keydown", this._globalKeyHandler);
  }

  private _handleGlobalKey(e: KeyboardEvent): void {
    if (e.code === this._config.pauseKey) {
      this._isPaused ? this.resume() : this.pause();
    }
    if (e.code === this._config.restartKey) {
      this.restart();
    }
  }
}
