import { World } from "../core/World";
import { GameLoop } from "./GameLoop";
import { UnifiedInputSystem } from "../input/UnifiedInputSystem";
import { EventBus } from "./EventBus";
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

/**
 * Configuration for the BaseGame instance.
 */
export interface BaseGameConfig {
  /** [KeyboardEvent.code] Key to toggle pause. */
  pauseKey?: string;
  /** [KeyboardEvent.code] Key to restart the game. */
  restartKey?: string;
  /** Enables multiplayer-specific synchronization logic. */
  isMultiplayer?: boolean;
  /** Global game options, including the initial simulation seed. */
  gameOptions?: Record<string, unknown>;
  /** Runs the game without visual systems or asset loading. Suitable for server-side execution. */
  headless?: boolean;
}

/**
 * Engine lifecycle states.
 */
export enum GameStatus {
  /** Instance created but subsytems not yet initialized. */
  UNINITIALIZED = "UNINITIALIZED",
  /** `init()` is currently executing. */
  INITIALIZING = "INITIALIZING",
  /** Systems and initial entities ready for simulation. */
  READY = "READY",
  /** `GameLoop` is active and systems are updating. */
  RUNNING = "RUNNING",
  /** Simulation paused, loop may still be ticking. */
  STOPPED = "STOPPED",
  /** Resources released, instance no longer usable. */
  DESTROYED = "DESTROYED",
}

/**
 * Main orchestrator of the game lifecycle and engine state.
 *
 * API status: Public
 *
 * Responsibility: Coordinate the initialization of systems and entities.
 *
 * Responsibility: Manage pause, resume, and restart transitions via `_transitionLock` to help
 * maintain consistency during asynchronous operations.
 *
 * Responsibility: Provide unified access to the ECS World and global resources.
 *
 * @remarks
 * This abstract class implements the engine's core loop, managing transitions between states
 * and aiming to provide a predictable execution pipeline. It utilizes a transition lock
 * to help prevent race conditions during asynchronous initialization and scene swaps.
 *
 * ### Standard Units
 *
 * - **Position/Distance**: Pixels `[px]`
 * - **Linear Velocity**: Pixels per second `[px/s]`
 * - **Linear Acceleration**: Pixels per second squared `[px/s^2]`
 * - **Rotation**: Radians `[rad]`
 * - **Angular Velocity**: Radians per second `[rad/s]`
 * - **System deltaTime**: Milliseconds `[ms]`
 * - **Physics Integration**: Seconds `[s]` (Low-level solvers)
 * - **Durations/Timers**: Milliseconds `[ms]`
 * - **Rates**: Per second `[1/s]` (e.g., Particle emission)
 *
 * ### Deterministic Simulation vs. Visual Presentation
 *
 * The engine attempts to maintain a boundary between the **Deterministic Simulation**
 * and the **Visual Presentation** layer:
 *
 * - **Deterministic Simulation**: Operates on a fixed time step. Logic affecting
 *   gameplay (physics, health, scores) is typically intended to occur here. It is
 *   designed to support simulation consistency when used under controlled
 *   conditions (e.g., seeded RNG, consistent execution order, and no direct mutations).
 * - **Visual Presentation**: Operates at the display's variable refresh rate. It
 *   typically uses interpolation between simulation states to help provide smoother motion.
 *   Visual-only effects (Juice, Particles, UI) reside here and are expected to
 *   avoid affecting the authoritative simulation state to prevent desyncs.
 *
 * ### State Classification
 *
 * To support determinism, state is typically classified into the following categories:
 *
 * 1. **Gameplay Deterministic State**: State intended for simulation (e.g., `Transform`, `Velocity`, `Health`). Should be serializable.
 * 2. **Presentation-only State**: Visual-only data (e.g., `Render`, `VisualOffset`, `ParticleEmitter`). Typically does NOT affect gameplay simulation.
 * 3. **Derived/Cache State**: Data computed from authoritative state (e.g., `SpatialGrid` nodes, `worldX`). Designed to be rebuildable.
 * 4. **Debug-only State**: Data used for development tools (e.g., `SystemProfiler` metrics).
 * 5. **Non-serializable Runtime State**: References to services or heavy objects (e.g., `EventBus`, `AudioSystem`).
 *
 * ### Determinism Guidelines
 *
 * - Presentation logic is recommended to avoid modifying authoritative gameplay state.
 * - Visual effects should typically avoid modifying `TransformComponent` if it affects physics or networking.
 * - Randomness in gameplay logic is expected to use `world.gameplayRandom`.
 * - Randomness in presentation should use `world.renderRandom`.
 * - Snapshots for Replay/Rollback are designed to capture serializable authoritative state.
 *
 * ### Execution Pipeline (Fixed Update)
 *
 * | Order | Phase | Typical Systems | Expected Mutation Rules |
 * | :--- | :--- | :--- | :--- |
 * | 1 | **PRE-UPDATE** | `InterpolationPrepSystem` | Reads Transform, Updates `PreviousTransform`. |
 * | 2 | **INPUT** | `UnifiedInputSystem` | Typically should NOT mutate simulation state directly. |
 * | 3 | **SIMULATION** (Logic) | `TTLSystem`, `StateMachineSystem`, Game Logic | May mutate components via `World.mutateComponent`. Structural changes (creation/deletion) should be deferred via `WorldCommandBuffer`. |
 * | 4 | **SIMULATION** (Physics) | `MovementSystem`, `FrictionSystem` | Updates `Transform` based on `Velocity`. |
 * | 5 | **COLLISION** | `CollisionSystem2D` | Reads Transform/Velocity. Updates `CollisionEvents`. |
 * | 6 | **GAME RULES** | `PhysicsSystem2D` (Resolution), Health/Damage | Resolves physics, applies damage, triggers game-over. |
 * | 7 | **TRANSFORM** | `HierarchySystem` | Propagates world matrices. |
 * | 8 | **PRESENTATION** | `JuiceSystem`, `ParticleSystem`, `AudioSystem` | Visual-only mutations. Triggers deferred events (SFX). |
 * | 9 | **REPLAY/FLUSH** | `ReplayRecorder`, `World.flush` | Captures state. Applies deferred structural changes. |
 * | 10 | **DEFERRED** | `EventBus.processDeferred` | Side effects (SFX, logs) isolated from core simulation. |
 *
 * ### Initialization Machine:
 * UNINITIALIZED -\> INITIALIZING -\> READY -\> RUNNING
 *
  * @remarks
  * In practice, determinism is a goal that requires strict adherence to engine
  * patterns. Factors such as floating-point non-determinism across architectures
  * or the use of unmanaged external state can lead to divergences.
  *
 * Conceptual Risk: [DETERMINISM][CRITICAL] `currentTick` overflow happens after ~285,000 years,
 * but buffer precision limits may be hit significantly earlier.
 * Conceptual Risk: [ASYNC_RACE][HIGH] Calling `start()` before the `init()` promise resolves
 * will lead to inconsistent simulation. Handled via state checks and locks.
 *
 * @public
 */
export abstract class BaseGame<TState, TInput extends Record<string, unknown>>
  implements IGame<BaseGame<TState, TInput>, TState> {

  /** Global ECS World. */
  protected world: World;
  /** Core timing loop orchestrator. */
  protected gameLoop: GameLoop;
  /** Multi-platform input aggregation service. */
  public readonly unifiedInput: UnifiedInputSystem;
  /** Central pub/sub for decoupled communication. */
  protected eventBus: EventBus;
  /** Manager for level/scene transitions. */
  protected sceneManager: SceneManager;
  /** Buffer for tracking historical inputs (Network/Replay). */
  protected inputBuffer: InputBuffer;
  /** Network communication interface (optional). */
  protected networkTransport?: NetworkTransport;
  /** Deterministic state/input recorder. */
  protected replayRecorder: ReplayRecorder;
  /** Audio playback and semantic bridge service. */
  public readonly audio: AudioSystem;
  /** Global spatial partitioning service (USSC). */
  public readonly spatialGrid: SpatialGrid;
  /** Incremental counter for simulation steps. */
  protected currentTick: number = 0;
  /** Initial seed used for PRNG streams. */
  protected currentSeed: number = 0;
  /** Indicates if the game is running in a multiplayer session. */
  public isMultiplayer: boolean;
  /** Indicates if the game is running in headless mode. */
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
  */
  public abstract initializeRenderer(renderer: import("../rendering/Renderer").Renderer<unknown>): void;

  constructor(config: BaseGameConfig = {}) {
    const { isMultiplayer = false, headless = false } = config;
    this.isMultiplayer = isMultiplayer;
    this.isHeadless = headless;
    this.world = new World();
    this.gameLoop = new GameLoop();
    this.unifiedInput = new UnifiedInputSystem();
    this.eventBus = new EventBus();
    this.sceneManager = new SceneManager(this.world);
    this.sceneManager.onWorldCreated = (world) => this.registerEssentialSystems(world);
    this.inputBuffer = new InputBuffer();
    this.replayRecorder = new ReplayRecorder();
    this.audio = new AudioSystem();
    this.spatialGrid = new SpatialGrid(100);
    this.hierarchySystem = new HierarchySystem();
    this.interpolationPrepSystem = new InterpolationPrepSystem();

    this._config = config;
    this.currentSeed = (config.gameOptions?.seed as number) ?? this._generateExternalSeed();

    // Initialize streams on the main world instance
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
    this.eventBus.on("audio:play_sfx", (payload: { name: string }) => {
      this.audio.playSFX(payload.name);
    });

    this.eventBus.on("audio:play_music", (payload: { name: string; loop?: boolean; volume?: number }) => {
      this.audio.playMusic(payload.name, payload);
    });

    this.eventBus.on("audio:stop_music", () => {
      this.audio.stopMusic();
    });

    this.eventBus.on("audio:mute", (payload: { muted: boolean }) => {
        this.audio.setMuted(payload.muted);
    });

    this.eventBus.on("audio:set_volume", (payload: { volume: number }) => {
        this.audio.setVolume(payload.volume);
    });

    // Semantic Audio Bridge: Mapping game events to audio effects
    // Uses emitDeferred to decouple from simulation
    this.eventBus.on("asteroid:destroyed", () => {
      if ((this._config.gameOptions as Record<string, unknown>)?.ENEMY_SFX_ENABLED === false) return;
      this.eventBus.emitDeferred("audio:play_sfx", { name: "explosion" });
    });

    this.eventBus.on("ship:shoot", () => {
      this.eventBus.emitDeferred("audio:play_sfx", { name: "shoot" });
    });

    this.eventBus.on("ship:hit", () => {
      this.eventBus.emitDeferred("audio:play_sfx", { name: "hit" });
    });

    this.eventBus.on("game:over", () => {
      this.eventBus.emitDeferred("audio:play_sfx", { name: "game_over" });
    });

    this.eventBus.on("si:kill", () => {
      if ((this._config.gameOptions as Record<string, unknown>)?.ENEMY_SFX_ENABLED === false) return;
      this.eventBus.emitDeferred("audio:play_sfx", { name: "explosion" });
    });

    this.eventBus.on("si:boss_defeated", () => {
      if ((this._config.gameOptions as Record<string, unknown>)?.ENEMY_SFX_ENABLED === false) return;
      this.eventBus.emitDeferred("audio:play_sfx", { name: "explosion" });
    });

    this.eventBus.on("powerup:collected", () => {
        this.eventBus.emitDeferred("audio:play_sfx", { name: "powerup" });
    });

    this.eventBus.on("level:up", () => {
        this.eventBus.emitDeferred("audio:play_sfx", { name: "level_up" });
    });

    this.eventBus.on("menu:select", () => {
        this.eventBus.emitDeferred("audio:play_sfx", { name: "menu_select" });
    });
  }

  /**
  * Internal loop configuration implementing the engine's simulation pipeline.
  */
  private setupLoop(): void {
    /**
     * Pipeline oriented towards simulation consistency (Fixed Update Phase):
     *
     * 1. PRE-UPDATE: Snapshot Transforms for Interpolation.
     * 2. INPUT: Process raw inputs into semantic actions.
     * 3. SIMULATION: Execute game logic and physics systems.
     * 4. POST-UPDATE: Propagate transforms through hierarchy.
     */
    this.gameLoop.subscribeUpdate((deltaTime) => {
      if (this._isPaused) return;

      const activeWorld = this.getWorld();

      // 0. PRE-UPDATE: Snapshots for interpolation
      this.interpolationPrepSystem.update(activeWorld, deltaTime);

      // 1. INPUT
      if (this.isMultiplayer) {
        // Multiplayer input handling logic (if any)
      } else {
        this.unifiedInput.update(activeWorld, deltaTime);
      }

      // 3. SIMULATION
      if (this.sceneManager.getCurrentScene()) {
        this.sceneManager.update(deltaTime);
      } else {
        this.world.update(deltaTime);
      }

      // 5. REPLAY RECORDING
      const currentInput = this.unifiedInput.getInputState();
      if (__DEV__) {
        const inputFrame = {
            tick: this.currentTick,
            timestamp: Date.now(),
            actions: currentInput.actions,
            axes: currentInput.axes,
            protocolVersion: 1 // TO-DO temporary fix
        };
        this.replayRecorder.recordTick(this.currentTick, { "local": [inputFrame] });
      }

      // 6. DEFERRED EVENTS
      this.eventBus.flushDeferred();

      this.currentTick++;
      this._notifyListeners();
    });
  }

  /**
  * Register game-specific ECS systems.
  */
  protected abstract registerSystems(): void;
  /**
  * Spawn initial entities for the current game mode.
  */
  protected abstract initializeEntities(): void;
  /**
  * Returns a serializable representation of the high-level game state.
  */
  public abstract getGameState(): TState;
  /**
  * Checks if the game has reached a terminal state.
  */
  public abstract isGameOver(): boolean;

  /**
  * Starts the simulation loop.
  *
  * @remarks
  * Expects the game to be initialized and not destroyed.
  * When successful, the {@link GameLoop} begins dispatching updates and
  * the status transitions to `RUNNING`.
  *
  * @throws Error - If called before `init` or on a destroyed game.
  */
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

  /** Checks if simulation is currently paused. */
  public isPausedState(): boolean { return this._isPaused; }

  /** Returns current engine lifecycle status. */
  public getStatus(): GameStatus { return this._status; }

  /** Accesses the core loop for direct subscriptions. */
  public getGameLoop(): GameLoop { return this.gameLoop; }

  /**
  * Restarts the game state, optionally with a new seed.
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
    if ((this._status as GameStatus) === GameStatus.UNINITIALIZED) {
      throw new Error("BaseGame: Cannot restart() before init().");
    }

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

  /**
  * Returns the currently active ECS World (Global or Scene-specific).
  *
  * @remarks
  * Primary source of truth for external observers (like Renderers).
  *
  * @returns Active {@link World} instance.
  */
  public getWorld(): World {
    const scene = this.sceneManager.getCurrentScene();
    return scene ? scene.getWorld() : this.world;
  }

  /** Returns the initial seed of the current simulation. */
  public getSeed(): number {
    return this.currentSeed;
  }

  /**
  * Initializes the game and its subsystems asynchronously.
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

    // The lock here helps protect against concurrent calls before the status changes.
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

  /**
  * Registers fundamental engine resources and core systems.
  */
  protected async registerEssentialSystems(world: World): Promise<void> {
    world.setResource("EventBus", this.eventBus);
    world.setResource("UnifiedInputSystem", this.unifiedInput);
    world.setResource("AudioSystem", this.audio);
    world.setResource("SpatialGrid", this.spatialGrid);

    // Initialize ScreenConfig with safe defaults or window dimensions
    const initialWidth = typeof window !== 'undefined' ? window.innerWidth : 800;
    const initialHeight = typeof window !== 'undefined' ? window.innerHeight : 600;
    world.setResource("ScreenConfig", { width: initialWidth, height: initialHeight });
    this._registerResizeListener();

    // Prevent accumulation of systems during restarts if they already exist in this world instance
    const existingSystems = world.systemsList;
    const hasXP = existingSystems.some(s => s instanceof XPSystem);
    const hasPalette = existingSystems.some(s => s instanceof PaletteSystem);

    if (!hasXP) {
      world.addSystem(new XPSystem(this.eventBus));
    }

    if (!hasPalette) {
      const profile = await PlayerProfileService.getProfile();
      world.addSystem(new PaletteSystem(profile.activePalette));
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SystemPhase } = require("./System");
    world.addSystem(new FeedbackSystem(), { phase: SystemPhase.Presentation });

    // Command Systems
    world.addSystem(new CommandMapperSystem(), { phase: SystemPhase.Input });
    world.addSystem(new CommandInvokerSystem(), { phase: SystemPhase.Simulation, priority: 10 });

    // Physics Systems
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PhysicsIntegrateSystem } = require("../physics/dynamics/PhysicsIntegrateSystem");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PhysicsSolveSystem } = require("../physics/dynamics/PhysicsSolveSystem");
    world.addSystem(new PhysicsIntegrateSystem(), { phase: SystemPhase.Simulation });
    world.addSystem(this.hierarchySystem, { phase: SystemPhase.Transform });
    world.addSystem(new PhysicsSolveSystem(), { phase: SystemPhase.GameRules });
  }

  /** [Inference] Potential hook for network lag compensation or loading. */
  protected shouldStallSimulation(): boolean {
    return false;
  }

  /**
  * Manually sets an input override for semantic actions.
  *
  * @param input - Map of action names to boolean pressed state.
  */
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

  /** Hook called during the restart transition before clearing the world. */
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
    console.debug(`[BaseGame] ScreenConfig updated: ${width}x${height}`);
  }
}
