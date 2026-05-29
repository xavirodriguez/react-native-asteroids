import { World } from "../core/World";
import { GameLoop } from "./GameLoop";
import { UnifiedInputSystem } from "../input/UnifiedInputSystem";
import { EventRegistry, EventBus } from "./EventBus";
import { InputBuffer } from "../network/InputBuffer";
import { NetworkTransport } from "../network/NetworkTransport";
import { ReplayRecorder } from "../debug/ReplayRecorder";
import { AudioSystem } from "./AudioSystem";
import { SpatialGrid } from "../physics/utils/SpatialGrid";
import { SceneManager } from "../scenes/SceneManager";
import type { IGame, UpdateListener } from "./IGame";
import { XPSystem } from "../systems/XPSystem";
import { PaletteSystem } from "../systems/PaletteSystem";
import { PlayerProfileService } from "../../services/PlayerProfileService";
import { HierarchySystem } from "../systems/HierarchySystem";
import { InterpolationPrepSystem } from "../systems/InterpolationPrepSystem";
import { FeedbackSystem } from "../systems/FeedbackSystem";
import { CommandMapperSystem } from "../commands/systems/CommandMapperSystem";
import { CommandInvokerSystem } from "../commands/systems/CommandInvokerSystem";
import { ComponentRegistry, BlueprintRegistryMap } from "./Component";
import { BlueprintRegistry } from "./BlueprintRegistry";

export interface BaseGameConfig {
  pauseKey?: string;
  restartKey?: string;
  isMultiplayer?: boolean;
  gameOptions?: Record<string, unknown>;
  headless?: boolean;
}

export enum GameStatus {
  UNINITIALIZED = "UNINITIALIZED",
  INITIALIZING = "INITIALIZING",
  READY = "READY",
  RUNNING = "RUNNING",
  STOPPED = "STOPPED",
  DESTROYED = "DESTROYED",
}

export abstract class BaseGame<
  TState,
  TInput extends Record<string, unknown>,
  TComponents extends ComponentRegistry,
  TEvents extends EventRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents>
> implements IGame<BaseGame<TState, TInput, TComponents, TEvents, TBlueprints>, TState> {

  protected world: World<TComponents, TEvents, TBlueprints>;
  protected gameLoop: GameLoop;
  public readonly unifiedInput: UnifiedInputSystem;
  protected eventBus: EventBus<TEvents>;
  protected sceneManager: SceneManager;
  protected inputBuffer: InputBuffer;
  protected networkTransport?: NetworkTransport;
  protected replayRecorder: ReplayRecorder;
  public readonly audio: AudioSystem;
  public readonly spatialGrid: SpatialGrid;
  protected blueprints: BlueprintRegistry<TComponents, TBlueprints>;
  protected currentTick: number = 0;
  protected currentSeed: number = 0;
  public isMultiplayer: boolean;
  public readonly isHeadless: boolean;

  private _status: GameStatus = GameStatus.UNINITIALIZED;
  private _transitionLock: Promise<void> | null = null;
  private _isPaused = false;
  private _listeners = new Set<UpdateListener<TState>>();
  private _globalKeyHandler = (e: KeyboardEvent) => this._handleGlobalKey(e);
  private _resizeHandler = () => this._handleResize();
  protected _config: BaseGameConfig;
  protected hierarchySystem: HierarchySystem;
  protected interpolationPrepSystem: InterpolationPrepSystem;

  /**
  * Abstract hook to configure the platform-specific renderer.
  *
  * @param renderer - Instance of the renderer (Canvas, Skia, etc).
  *
  * @public
  */
  public abstract initializeRenderer(renderer: import("../rendering/Renderer").Renderer<unknown>): void;

  constructor(config: BaseGameConfig = {}) {
    const { isMultiplayer = false, headless = false } = config;
    this.isMultiplayer = isMultiplayer;
    this.isHeadless = headless;
    this.world = new World<TComponents, TEvents, TBlueprints>();
    this.gameLoop = new GameLoop();
    this.unifiedInput = new UnifiedInputSystem();
    this.eventBus = new EventBus<TEvents>();
    this.sceneManager = new SceneManager(this.world as any);
    this.sceneManager.onWorldCreated = (world) => this.registerEssentialSystems(world as any);
    this.inputBuffer = new InputBuffer();
    this.replayRecorder = new ReplayRecorder();
    this.audio = new AudioSystem();
    this.spatialGrid = new SpatialGrid(100);
    this.hierarchySystem = new HierarchySystem();
    this.interpolationPrepSystem = new InterpolationPrepSystem();
    this.blueprints = new BlueprintRegistry<TComponents, TBlueprints>();

    this._config = config;
    this.currentSeed = (config.gameOptions?.seed as number) ?? this._generateExternalSeed();

    this.world.gameplayRandom.setSeed(this.currentSeed);
    this.world.renderRandom.setSeed(this.currentSeed ^ 0xDEADBEEF);

    this.setupLoop();
    this._registerKeyboardListeners();
    this._setupAudioListeners();
  }

  /**
  * Returns the input system aggregator.
  */
  public getInputSystem(): UnifiedInputSystem {
    return this.unifiedInput;
  }

/**
  * Configures global semantic audio listeners.
  */
  private _setupAudioListeners(): void {
    this.eventBus.on("audio:play_sfx" as any, (payload: { name: string }) => {
      this.audio.playSFX(payload.name);
    });

    this.eventBus.on("audio:play_music" as any, (payload: { name: string; loop?: boolean; volume?: number }) => {
      this.audio.playMusic(payload.name, payload);
    });

    this.eventBus.on("audio:stop_music" as any, () => {
      this.audio.stopMusic();
    });

    this.eventBus.on("audio:mute" as any, (payload: { muted: boolean }) => {
        this.audio.setMuted(payload.muted);
    });

    this.eventBus.on("audio:set_volume" as any, (payload: { volume: number }) => {
        this.audio.setVolume(payload.volume);
    });
  }

  /**
  * Internal loop configuration implementing the engine's simulation pipeline.
  */
  private setupLoop(): void {
    this.gameLoop.subscribeUpdate((deltaTime) => {
      if (this._isPaused) return;

      const activeWorld = this.getWorld();
      this.interpolationPrepSystem.update(activeWorld as any, deltaTime);

      if (this.isMultiplayer) {
      } else {
        this.unifiedInput.update(activeWorld as any, deltaTime);
      }

      if (this.sceneManager.getCurrentScene()) {
        this.sceneManager.update(deltaTime);
      } else {
        this.world.update(deltaTime);
      }

      const currentInput = this.unifiedInput.getInputState();
      if (__DEV__) {
        const inputFrame = {
            tick: this.currentTick,
            timestamp: Date.now(),
            actions: currentInput.actions,
            axes: currentInput.axes,
            protocolVersion: 1
        };
        this.replayRecorder.recordTick(this.currentTick, { "local": [inputFrame] });
      }

      this.eventBus.flushDeferred();
      this.currentTick++;
      this._notifyListeners();
    });
  }

  protected abstract registerSystems(): void;
  protected abstract initializeEntities(): void;
  public abstract getGameState(): TState;
  public abstract isGameOver(): boolean;

  public start(): void {
    if (this._status === GameStatus.UNINITIALIZED || this._status === GameStatus.INITIALIZING) {
      throw new Error("BaseGame: Cannot start() before init().");
    }
    if (this._status === GameStatus.DESTROYED) {
      throw new Error("BaseGame: Cannot start() on a destroyed game.");
    }
    if (this._status === GameStatus.RUNNING) {
      return;
    }
    this._status = GameStatus.RUNNING;
    this.gameLoop.start();
  }

  /**
  * Stops the simulation loop.
  *
  * @remarks
  * When called, the {@link GameLoop} is expected to stop and the
  * status transitions to `STOPPED`.
  */
  public stop(): void {
    if (
      this._status === GameStatus.UNINITIALIZED ||
      this._status === GameStatus.INITIALIZING ||
      this._status === GameStatus.STOPPED ||
      this._status === GameStatus.DESTROYED
    ) {
      return;
    }
    this.gameLoop.stop();
    this._status = GameStatus.STOPPED;
  }

  /**
  * Pauses simulation logic while keeping the renderer active.
  *
  * @remarks
  * Idempotent. Only effective if status is `RUNNING`.
  *
  * Postcondition: `_isPaused` set to `true`.
  * Side Effect: Notifies current scene and external subscribers.
  */
  public pause(): void {
    if (this._status !== GameStatus.RUNNING || this._isPaused) return;
    this._isPaused = true;
    this.sceneManager.pause();
    this._notifyListeners();
  }

  /**
  * Resumes simulation logic.
  *
  * @remarks
  * Idempotent. Only effective if currently paused.
  *
  * Postcondition: `_isPaused` set to `false`.
  */
  public resume(): void {
    if (this._status !== GameStatus.RUNNING || !this._isPaused) return;
    this._isPaused = false;
    this.sceneManager.resume();
    this._notifyListeners();
  }

  public isPausedState(): boolean { return this._isPaused; }
  public getStatus(): GameStatus { return this._status; }
  public getGameLoop(): GameLoop { return this.gameLoop; }

  /**
  * Attempts to restart the game state, optionally with a new seed.
  *
  * @remarks
  * State transition is designed to be protected by a lock. It typically pauses
  * simulation and clears volatile resources to help prevent memory leaks.
  *
  * Logic:
  * - If an active Scene exists, delegates restart to `SceneManager`.
  * - Otherwise, clears the global World, re-registers systems, and re-spawns entities.
  *
  * @param seed - Optional new seed for deterministic PRNG.
  */
  public async restart(seed?: number): Promise<void> {
    if (this._status === GameStatus.DESTROYED) {
      throw new Error("BaseGame: Cannot restart() on a destroyed game.");
    }
    if (this._status === GameStatus.UNINITIALIZED) {
      throw new Error("BaseGame: Cannot restart() before init().");
    }

    while (this._transitionLock) {
      await this._transitionLock;
    }
    if ((this._status as GameStatus) === GameStatus.DESTROYED) return;

    const previousStatus = this._status;
    const previousPaused = this._isPaused;

    let resolveLock: () => void;
    this._transitionLock = new Promise((resolve) => { resolveLock = resolve; });
    try {
      this._status = GameStatus.INITIALIZING;
      this._isPaused = true;

      await this._onBeforeRestart();
      if ((this._status as GameStatus) === GameStatus.DESTROYED) return;

      if (seed !== undefined) {
        this.currentSeed = seed;
        const activeWorld = this.getWorld();
        activeWorld.gameplayRandom.setSeed(this.currentSeed);
        activeWorld.renderRandom.setSeed(this.currentSeed ^ 0xDEADBEEF);
      }

      this.eventBus.clear();
      this._setupAudioListeners();
      this.spatialGrid.clear();

      if (this.sceneManager.getCurrentScene()) {
        await this.sceneManager.restartCurrentScene();
      } else {
        this.world.clear();
        this.world.clearSystems();
        await this.registerEssentialSystems(this.world);
        this.registerSystems();
        this.initializeEntities();
      }

      if ((this._status as GameStatus) === GameStatus.DESTROYED) return;

      this._status = previousStatus;
      this._isPaused = false;
      this._notifyListeners();
    } catch (error) {
      if ((this._status as GameStatus) !== GameStatus.DESTROYED) {
        this._status = previousStatus;
        this._isPaused = previousPaused;
      }
      throw error;
    } finally {
      this._transitionLock = null;
      resolveLock!();
    }
  }

  /**
  * Releases resources and shuts down the engine.
  *
  * @remarks
  * Stops the loop, cleans up input listeners, and clears subscriptions.
  * Once destroyed, the instance cannot be reused.
  *
  * Postcondition: Status set to `DESTROYED`.
  */
  public destroy(): void {
    if (this._status === GameStatus.DESTROYED) {
      return;
    }
    this.stop();
    this.unifiedInput.cleanup();
    this._unregisterKeyboardListeners();
    this._unregisterResizeListener();
    this._listeners.clear();

    this.eventBus.clear();
    this.spatialGrid.clear();
    this.world.clear();
    this.world.clearSystems();

    this.sceneManager.destroy();
    this.audio.stopMusic();

    this._status = GameStatus.DESTROYED;
  }

  public getWorld(): World<TComponents, TEvents, TBlueprints> {
    const scene = this.sceneManager.getCurrentScene();
    return scene ? (scene.getWorld() as any) : this.world;
  }

  public getSeed(): number {
    return this.currentSeed;
  }

  /**
  * Attempts to initialize the game and its subsystems asynchronously.
  *
  * @remarks
  * Initialization process intended to occur before {@link BaseGame.start}.
  *
  * ### Concurrency Control:
  * The process uses an internal `_transitionLock` (Promise-based lock) designed to
  * help ensure that multiple calls to `init()` or `restart()` do not overlap,
  * with the goal of reducing the risk of inconsistent engine states during system registration.
  *
  * Expected Flow:
  * 1. Register Essential Resources (EventBus, Input, Audio, SpatialGrid).
  * 2. Execute `registerSystems()` (User Hook).
  * 3. Execute `initializeEntities()` (User Hook).
  * 4. Transition status to `READY`.
  *
  * @throws Error - If already initialized or currently in progress.
  */
  public async init(): Promise<void> {
    if (this._status === GameStatus.DESTROYED) return;
    if (this._status !== GameStatus.UNINITIALIZED) {
      throw new Error(`BaseGame: Cannot initialize from state ${this._status}`);
    }

    if (this._transitionLock) {
      await this._transitionLock;
    }
    if (this._status !== GameStatus.UNINITIALIZED) return;

    let resolveLock: () => void;
    this._transitionLock = new Promise((resolve) => { resolveLock = resolve; });

    try {
      this._status = GameStatus.INITIALIZING;
      await this.registerEssentialSystems(this.world);

      if ((this._status as GameStatus) === GameStatus.DESTROYED) return;

      this.registerSystems();
      this.initializeEntities();
      this._status = GameStatus.READY;
    } catch (error) {
      if ((this._status as GameStatus) !== GameStatus.DESTROYED) {
        this.world.clear();
        this.world.clearSystems();
        this._status = GameStatus.UNINITIALIZED;
      }
      throw error;
    } finally {
      this._transitionLock = null;
      resolveLock!();
    }
  }

  protected async registerEssentialSystems(world: World<TComponents, TEvents, TBlueprints>): Promise<void> {
    world.setResource("EventBus", this.eventBus);
    world.setResource("UnifiedInputSystem", this.unifiedInput);
    world.setResource("AudioSystem", this.audio);
    world.setResource("SpatialGrid", this.spatialGrid);
    world.setResource("BlueprintRegistry", this.blueprints);

    const initialWidth = typeof window !== 'undefined' ? window.innerWidth : 800;
    const initialHeight = typeof window !== 'undefined' ? window.innerHeight : 600;
    world.setResource("ScreenConfig", { width: initialWidth, height: initialHeight });
    this._registerResizeListener();

    const existingSystems = world.systemsList;
    const hasXP = existingSystems.some(s => s instanceof XPSystem);
    const hasPalette = existingSystems.some(s => s instanceof PaletteSystem);

    if (!hasXP) {
      world.addSystem(new XPSystem(this.eventBus as any) as any);
    }

    if (!hasPalette) {
      const profile = await PlayerProfileService.getProfile();
      world.addSystem(new PaletteSystem(profile.activePalette) as any);
    }

    const { SystemPhase } = require("./System");
    world.addSystem(new FeedbackSystem() as any, { phase: SystemPhase.Presentation });

    world.addSystem(new CommandMapperSystem() as any, { phase: SystemPhase.Input });
    world.addSystem(new CommandInvokerSystem() as any, { phase: SystemPhase.Simulation, priority: 10 });

    const { PhysicsIntegrateSystem } = require("../physics/dynamics/PhysicsIntegrateSystem");
    const { PhysicsSolveSystem } = require("../physics/dynamics/PhysicsSolveSystem");
    world.addSystem(new PhysicsIntegrateSystem() as any, { phase: SystemPhase.Simulation });
    world.addSystem(this.hierarchySystem as any, { phase: SystemPhase.Transform });
    world.addSystem(new PhysicsSolveSystem() as any, { phase: SystemPhase.GameRules });
  }

  public setInput(input: Record<string, unknown>): void {
    if (
      this._status === GameStatus.UNINITIALIZED ||
      this._status === GameStatus.INITIALIZING ||
      this._status === GameStatus.DESTROYED
    ) {
      return;
    }
    Object.entries(input).forEach(([action, pressed]) => {
      this.unifiedInput.setOverride(action, !!pressed);
    });
  }

  /**
  * Subscribes to lifecycle update events.
  *
  * @returns Unsubscribe function.
  */
  public subscribe(listener: UpdateListener<TState>): () => void {
    if (this._status === GameStatus.DESTROYED) {
      console.warn("BaseGame: Attempted to subscribe to a DESTROYED game.");
      return () => {};
    }
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  protected _onBeforeRestart(): void | Promise<void> {}

  /**
  * Generates an external seed to avoid consuming the gameplay stream.
  */
  private _generateExternalSeed(): number {
    return Math.floor(Math.random() * 0xFFFFFFFF);
  }

  private _notifyListeners(): void {
    const state = this.getGameState();
    this._listeners.forEach(l => l(state));
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
    if (e.code === this._config.pauseKey) { if (this._isPaused) this.resume(); else this.pause(); };
    if (e.code === this._config.restartKey) {
      this.restart().catch(console.error);
    }
  }

  private _registerResizeListener(): void {
    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      window.addEventListener("resize", this._resizeHandler);
    }
  }

  private _unregisterResizeListener(): void {
    if (typeof window !== "undefined" && typeof window.removeEventListener === "function") {
      window.removeEventListener("resize", this._resizeHandler);
    }
  }

  private _handleResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.getWorld().setResource("ScreenConfig", { width, height });
  }
}
