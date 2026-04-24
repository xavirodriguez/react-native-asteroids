import { World } from "../core/World";
import { GameLoop } from "./GameLoop";
import { UnifiedInputSystem } from "./input/UnifiedInputSystem";
import { EventBus } from "../core/EventBus";
import { InputBuffer } from "../network/InputBuffer";
import { NetworkTransport } from "../network/NetworkTransport";
import { ReplayRecorder } from "../debug/ReplayRecorder";
import { SceneManager } from "./scenes/SceneManager";
import { RandomService } from "../utils/RandomService";
import type { IGame, UpdateListener } from "./IGame";
import { XPSystem } from "../gameplay/systems/XPSystem";
import { PaletteSystem } from "../gameplay/systems/PaletteSystem";
import { PlayerProfileService } from "../../services/PlayerProfileService";
import { HierarchySystem } from "../physics2d/systems/HierarchySystem";
import { InterpolationPrepSystem } from "../presentation/systems/InterpolationPrepSystem";
import { StateMachine } from "../core/StateMachine";

export interface BaseGameConfig {
  pauseKey?: string;
  restartKey?: string;
  isMultiplayer?: boolean;
  gameOptions?: Record<string, unknown>;
}

export enum GameState {
  Uninitialized = "Uninitialized",
  Initializing = "Initializing",
  Ready = "Ready",
  Running = "Running",
  Paused = "Paused",
  Restarting = "Restarting",
  Stopped = "Stopped",
  Destroyed = "Destroyed",
}

/**
 * Orquestador principal del ciclo de vida y el estado del juego.
 */
export abstract class BaseGame<TState, TInput extends Record<string, unknown>>
  implements IGame<BaseGame<TState, TInput>> {

  protected world: World;
  protected gameLoop: GameLoop;
  public readonly unifiedInput: UnifiedInputSystem;
  protected eventBus: EventBus;
  protected sceneManager: SceneManager;
  protected inputBuffer: InputBuffer;
  protected networkTransport?: NetworkTransport;
  protected replayRecorder: ReplayRecorder;
  protected currentTick: number = 0;
  protected currentSeed: number = 0;
  public isMultiplayer: boolean;

  private _listeners = new Set<UpdateListener<BaseGame<TState, TInput>>>();
  private _globalKeyHandler = (e: KeyboardEvent) => this._handleGlobalKey(e);
  protected _config: BaseGameConfig;
  protected hierarchySystem: HierarchySystem;
  protected interpolationPrepSystem: InterpolationPrepSystem;
  private _fsm: StateMachine<GameState, BaseGame<TState, TInput>>;

  public abstract initializeRenderer(renderer: import("../presentation/rendering/Renderer").Renderer<unknown>): void;

  constructor(config: BaseGameConfig = {}) {
    const { isMultiplayer = false } = config;
    this.isMultiplayer = isMultiplayer;
    this.world = new World();
    this.gameLoop = new GameLoop();
    this.unifiedInput = new UnifiedInputSystem();
    this.eventBus = new EventBus();
    this.sceneManager = new SceneManager(this.world);
    this.inputBuffer = new InputBuffer();
    this.replayRecorder = new ReplayRecorder();
    this.hierarchySystem = new HierarchySystem();
    this.interpolationPrepSystem = new InterpolationPrepSystem();

    this.world.setResource("EventBus", this.eventBus);
    this.world.setResource("UnifiedInputSystem", this.unifiedInput);

    this._config = config;
    this.currentSeed = (config.gameOptions?.seed as number) ?? this._generateExternalSeed();

    // Initialize streams
    RandomService.getGameplayRandom().setSeed(this.currentSeed);
    RandomService.getRenderRandom().setSeed(this.currentSeed ^ 0xDEADBEEF);

    this._fsm = new StateMachine<GameState, BaseGame<TState, TInput>>({
      initial: GameState.Uninitialized,
      states: {
        [GameState.Uninitialized]: {},
        [GameState.Initializing]: {},
        [GameState.Ready]: {},
        [GameState.Running]: {
          onEnter: () => this.gameLoop.start(),
          onExit: () => this.gameLoop.stop(),
          onUpdate: (_, dt) => this._step(dt)
        },
        [GameState.Paused]: {
            onEnter: () => this.sceneManager.pause(),
            onExit: () => this.sceneManager.resume()
        },
        [GameState.Restarting]: {},
        [GameState.Stopped]: {
          onEnter: () => this.gameLoop.stop()
        },
        [GameState.Destroyed]: {
          onEnter: () => {
            this.gameLoop.stop();
            this.unifiedInput.cleanup();
            this._unregisterKeyboardListeners();
            this._listeners.clear();
          }
        }
      }
    }, this);

    this.setupLoop();
    this._registerKeyboardListeners();
  }

  private setupLoop(): void {
    this.gameLoop.subscribeUpdate((deltaTime) => {
        if (this._fsm.getCurrentState() === GameState.Running || this._fsm.getCurrentState() === GameState.Paused) {
            this._fsm.update(deltaTime);
        }
    });
  }

  private _step(deltaTime: number): void {
      const activeWorld = this.getWorld();

      // 0. PRE-UPDATE: Snapshot for interpolation
      this.interpolationPrepSystem.update(activeWorld, deltaTime);

      // 1. INPUT
      if (this.isMultiplayer) {
        // Multiplayer input handling
      } else {
        this.unifiedInput.update(activeWorld, deltaTime);
      }

      // 3. SIMULATION
      if (this.sceneManager.getCurrentScene()) {
        this.sceneManager.update(deltaTime);
      } else {
        this.world.update(deltaTime);
      }

      // 4. POST-UPDATE: Transform Propagation
      this.hierarchySystem.update(activeWorld, deltaTime);

      // 5. FLUSH
      activeWorld.flush();

      this.currentTick++;
      this._notifyListeners();
  }

  protected abstract registerSystems(): void;
  protected abstract initializeEntities(): void;
  public abstract getGameState(): TState;
  public abstract isGameOver(): boolean;

  public start(): void {
    const state = this._fsm.getCurrentState();
    if (state === GameState.Ready || state === GameState.Paused || state === GameState.Stopped) {
        this._fsm.transition(GameState.Running);
    } else if (state === GameState.Uninitialized) {
        console.warn("BaseGame: Cannot start before init().");
    }
  }

  public stop(): void {
    this._fsm.transition(GameState.Stopped);
  }

  public pause(): void {
    if (this._fsm.getCurrentState() === GameState.Running) {
        this._fsm.transition(GameState.Paused);
        this._notifyListeners();
    }
  }

  public resume(): void {
    if (this._fsm.getCurrentState() === GameState.Paused) {
        this._fsm.transition(GameState.Running);
        this._notifyListeners();
    }
  }

  public isPausedState(): boolean {
    return this._fsm.getCurrentState() === GameState.Paused;
  }

  public getGameLoop(): GameLoop { return this.gameLoop; }

  private _isRestarting = false;
  public async restart(seed?: number): Promise<void> {
    if (this._isRestarting) return;
    this._isRestarting = true;
    
    const prevState = this._fsm.getCurrentState();
    this._fsm.transition(GameState.Restarting);

    try {
        await this._onBeforeRestart();

        if (seed !== undefined) {
          this.currentSeed = seed;
          RandomService.getGameplayRandom().setSeed(this.currentSeed);
          RandomService.getRenderRandom().setSeed(this.currentSeed ^ 0xDEADBEEF);
        }

        if (this.sceneManager.getCurrentScene()) {
          // Restart currently doesn't do much special, it just re-enters the scene
          await this.sceneManager.transitionTo(this.sceneManager.getCurrentScene()!);
        } else {
          this.world.clear();
          this.initializeEntities();
        }
        
        this._fsm.transition(GameState.Running);
        this._notifyListeners();
    } finally {
        this._isRestarting = false;
    }
  }

  public destroy(): void {
    this._fsm.transition(GameState.Destroyed);
  }

  public getWorld(): World {
    const scene = this.sceneManager.getCurrentScene();
    return scene ? scene.getWorld() : this.world;
  }

  public getSeed(): number {
    return this.currentSeed;
  }

  public async init(): Promise<void> {
    if (this._fsm.getCurrentState() !== GameState.Uninitialized) return;
    
    this._fsm.transition(GameState.Initializing);
    await this.registerEngineSystems();
    this.registerSystems();
    this.initializeEntities();
    this._fsm.transition(GameState.Ready);
  }

  protected async registerEngineSystems(): Promise<void> {
    this.world.addSystem(new XPSystem(this.eventBus));
    const profile = await PlayerProfileService.getProfile();
    this.world.addSystem(new PaletteSystem(profile.activePalette));
  }

  protected shouldStallSimulation(): boolean {
    return false;
  }

  public setInput(input: Record<string, unknown>): void {
    Object.entries(input).forEach(([action, pressed]) => {
      this.unifiedInput.setOverride(action, !!pressed);
    });
  }

  public subscribe(listener: UpdateListener<BaseGame<TState, TInput>>): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  protected _onBeforeRestart(): void | Promise<void> {}

  private _generateExternalSeed(): number {
    return Math.floor(Math.random() * 0xFFFFFFFF);
  }

  private _notifyListeners(): void {
    this._listeners.forEach(l => l(this));
  }

  private _registerKeyboardListeners(): void {
    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      window.addEventListener("keydown", this._globalKeyHandler);
    }
  }

  private _unregisterKeyboardListeners(): void {
    if (typeof window !== "undefined" && typeof window.removeEventListener === "function") {
      window.removeEventListener("keydown", this._globalKeyHandler);
    }
  }

  private _handleGlobalKey(e: KeyboardEvent): void {
    if (e.code === this._config.pauseKey) {
        if (this.isPausedState()) this.resume(); else this.pause();
    };
    if (e.code === this._config.restartKey) {
      this.restart().catch(console.error);
    }
  }
}
