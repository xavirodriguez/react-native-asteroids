import { World } from "../core/World";
import { GameLoop } from "./GameLoop";
import { UnifiedInputSystem } from "../input/UnifiedInputSystem";
import { EventBus } from "./EventBus";
import { InputBuffer } from "../network/InputBuffer";
import { NetworkTransport } from "../network/NetworkTransport";
import { ReplayRecorder } from "../debug/ReplayRecorder";
import { StateHasher } from "../debug/StateHasher";
import { SceneManager } from "../scenes/SceneManager";
import { runLifecycle } from "../utils/LifecycleUtils";
import { RandomService } from "../utils/RandomService";
import { InputStateComponent } from "./CoreComponents";
import type { IGame, UpdateListener } from "./IGame";

export interface BaseGameConfig {
  pauseKey?: string;    // Key code for pausing, e.g., "KeyP"
  restartKey?: string;  // Key code for restarting, e.g., "KeyR"
  isMultiplayer?: boolean;
  gameOptions?: any;    // Generic field for subclass-specific initial options
}

/**
 * Abstract base class for all games.
 * Provides boilerplate for lifecycle management, input, and listeners.
 */
export abstract class BaseGame<TState, TInput extends Record<string, any>>
  implements IGame<BaseGame<TState, TInput>> {

  protected world: World;
  protected gameLoop: GameLoop;
  protected unifiedInput: UnifiedInputSystem;
  protected eventBus: EventBus;
  protected sceneManager: SceneManager;
  protected inputBuffer: InputBuffer;
  protected networkTransport?: NetworkTransport;
  protected replayRecorder: ReplayRecorder;
  protected currentTick: number = 0;
  public isMultiplayer: boolean;

  private _isPaused = false;
  private _listeners = new Set<UpdateListener<BaseGame<TState, TInput>>>();
  private _globalKeyHandler = (e: KeyboardEvent) => this._handleGlobalKey(e);
  protected _config: BaseGameConfig;

  constructor(config: BaseGameConfig = {}) {
    const { isMultiplayer = false } = config;
    this.isMultiplayer = isMultiplayer;
    this.world = new World();
    this.gameLoop = new GameLoop();
    this.unifiedInput = new UnifiedInputSystem();
    this.eventBus = new EventBus();
    this.sceneManager = new SceneManager();
    this.inputBuffer = new InputBuffer();
    this.replayRecorder = new ReplayRecorder();

    this.registerEventBusSingleton();

    // Start recording by default if in debug mode
    if (__DEV__) {
      this.replayRecorder.startRecording();
    }

    this._config = config;

    // Initialize deterministic random service with a default seed
    const initialSeed = config.gameOptions?.seed ?? Date.now();
    RandomService.setSeed(initialSeed);

    // Register systems and initial entities - responsibility of the concrete game
    this.registerSystems();
    this.initializeEntities();

    // Notify React on each logical update frame
    this.gameLoop.subscribeUpdate((deltaTime) => {
      if (!this._isPaused) {
        // Capture local input as frame and broadcast (MUST happen before tick check)
        if (this.isMultiplayer && this.networkTransport) {
          const inputState = this.unifiedInput.getInputState();
          const frame = {
            tick: this.currentTick,
            timestamp: Date.now(),
            actions: inputState.actions || [],
            axes: inputState.axes || {},
          };
          this.inputBuffer.addLocalInput(frame);
          this.networkTransport.send({ type: "input", frame, sessionId: this.networkTransport.getSessionId() });
        }

        // Lockstep integration: only proceed if all inputs (including local) are ready for current tick
        if (this.isMultiplayer && !this._isTickReady(this.currentTick)) {
          return;
        }

        // Update input system first
        const activeWorld = this.getWorld();

        if (this.isMultiplayer) {
          // In multiplayer, we use inputs from the buffer for the current tick
          const tickInputs = this.inputBuffer.getInputsForTick(this.currentTick);
          this._applyNetworkInputs(activeWorld, tickInputs);
        } else {
          this.unifiedInput.update(activeWorld, deltaTime);
        }

        // Simple games update this.world, advanced games update via sceneManager
        if (this.sceneManager.getCurrentScene()) {
          this.sceneManager.update(deltaTime);
        } else {
          this.world.update(deltaTime);
        }

        // Record for replay if recording
        this.replayRecorder.recordTick(this.currentTick, this.inputBuffer.getInputsForTick(this.currentTick) as any);

        // Debug desync detection
        if (this.isMultiplayer && activeWorld.debugMode && this.currentTick % 60 === 0) {
          const hash = StateHasher.calculateHash(activeWorld);
          console.log(`[Tick ${this.currentTick}] State Hash: ${hash}`);
        }

        this.currentTick++;
        this._notifyListeners();
      }
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
    this.sceneManager.pause();
    this._notifyListeners();
  }

  public resume(): void {
    if (!this._isPaused) return;
    this._isPaused = false;
    this.sceneManager.resume();
    this._notifyListeners();
  }

  public async restart(): Promise<void> {
    const initialScene = this.sceneManager.getCurrentScene();

    await runLifecycle(() => this._onBeforeRestart());

    const currentScene = this.sceneManager.getCurrentScene();

    if (initialScene && currentScene === initialScene) {
      // Scene didn't change during _onBeforeRestart, so we restart the current one.
      await this.sceneManager.restartCurrentScene();
    } else if (!initialScene && !currentScene) {
      this.world.clear();
      this.initializeEntities();
    }

    if (this._isPaused) this.resume();
    this._notifyListeners();
  }

  public destroy(): void {
    this.stop();
    this.unifiedInput.cleanup();
    this._unregisterKeyboardListeners();
    this._listeners.clear();
  }

  public getWorld(): World {
    const activeScene = this.sceneManager.getCurrentScene();
    return activeScene ? activeScene.getWorld() : this.world;
  }

  public isPausedState(): boolean {
    return this._isPaused;
  }

  /**
   * Optional hook for subclasses to stall the entire world update.
   * Useful for lockstep netcode waiting for inputs.
   */
  protected shouldStallSimulation(): boolean {
    return false;
  }

  public setInput(input: Partial<TInput>): void {
    Object.entries(input).forEach(([action, pressed]) => {
      this.unifiedInput.setOverride(action, pressed as boolean);
    });
  }

  public subscribe(listener: UpdateListener<BaseGame<TState, TInput>>): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  // ─── Optional hook — can be overridden ───────────────────────────────────

  /**
   * Sets the network transport for multiplayer games.
   */
  public setNetworkTransport(transport: NetworkTransport): void {
    this.networkTransport = transport;
    this.networkTransport.onMessage((data) => this._handleNetworkMessage(data));
  }

  /**
   * Called during restart() after scene/world restart.
   * Useful for resetting internal game state (e.g., gameOverLogged = false).
   */
  protected _onBeforeRestart(): void | Promise<void> {}

  // ─── Engine-internal methods ─────────────────────────────────────────────

  private _applyNetworkInputs(world: World, tickInputs: Record<string, any>): void {
    // This is a simplified implementation.
    // Usually, you'd have one InputState per player or a merged one.
    // For now, we'll merge all inputs into the InputState singleton for the simulation.
    let mergedActions = new Set<string>();
    let mergedAxes: Record<string, number> = {};

    Object.values(tickInputs).forEach(frame => {
      if (frame) {
        // frame.actions is string[] from getInputState()
        frame.actions?.forEach((a: string) => mergedActions.add(a));
        // frame.axes is Record<string, number>
        Object.entries(frame.axes || {}).forEach(([axis, val]) => {
          mergedAxes[axis] = (mergedAxes[axis] || 0) + (val as number);
        });
      }
    });

    let inputState = world.getSingleton<InputStateComponent>("InputState");
    if (inputState) {
      inputState.actions.clear();
      mergedActions.forEach(a => inputState!.actions.set(a, true));
      inputState.axes.clear();
      Object.entries(mergedAxes).forEach(([axis, val]) => inputState!.axes.set(axis, val));
    }
  }

  private _handleNetworkMessage(data: any): void {
    if (data.type === "input") {
      this.inputBuffer.addRemoteInput(data.sessionId, data.frame);
    }
  }

  private _isTickReady(tick: number): boolean {
    // In a real scenario, we'd need a list of connected session IDs
    // This is a simplified check
    const expectedSessions = this.world.getResource<string[]>("connectedSessions") || [];
    return this.inputBuffer.isTickReady(tick, expectedSessions);
  }

  private registerEventBusSingleton(): void {
    const entity = this.world.createEntity();
    this.world.addComponent(entity, {
      type: "EventBus",
      bus: this.eventBus,
    });
  }

  private _notifyListeners(): void {
    const listeners = Array.from(this._listeners);
    for (const listener of listeners) {
      listener(this);
    }
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
      if (this._isPaused) {
        this.resume();
      } else {
        this.pause();
      }
    }
    if (e.code === this._config.restartKey) {
      this.restart().catch(console.error);
    }
  }
}
