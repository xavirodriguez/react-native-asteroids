import { World } from "../core/World";
import { GameLoop } from "./GameLoop";
import { UnifiedInputSystem } from "../input/UnifiedInputSystem";
import { EventBus } from "./EventBus";
import { InputBuffer } from "../network/InputBuffer";
import { NetworkTransport } from "../network/NetworkTransport";
import { ReplayRecorder } from "../debug/ReplayRecorder";
import { SceneManager } from "../scenes/SceneManager";
import { RandomService } from "../utils/RandomService";
import { PreviousTransformComponent, TransformComponent } from "./CoreComponents";
import type { IGame, UpdateListener } from "./IGame";
import { XPSystem } from "../systems/XPSystem";
import { PaletteSystem } from "../systems/PaletteSystem";
import { PlayerProfileService } from "../../services/PlayerProfileService";
import { HierarchySystem } from "../systems/HierarchySystem";

export interface BaseGameConfig {
  pauseKey?: string;
  restartKey?: string;
  isMultiplayer?: boolean;
  gameOptions?: Record<string, unknown>;
}

/**
 * Main orchestrator for game lifecycle and state.
 *
 * @remarks
 * Enforces a strict deterministic pipeline:
 * 1. Input 
 * 2. Simulation Update 
 * 3. Transform Propagation.
 * Render phase is decoupled and handles interpolation.
 */
export abstract class BaseGame<TState, TInput extends Record<string, unknown>>
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
  protected currentSeed: number = 0;
  public isMultiplayer: boolean;

  private _isPaused = false;
  private _listeners = new Set<UpdateListener<BaseGame<TState, TInput>>>();
  private _globalKeyHandler = (e: KeyboardEvent) => this._handleGlobalKey(e);
  protected _config: BaseGameConfig;
  protected hierarchySystem: HierarchySystem;

  public abstract initializeRenderer(renderer: import("../rendering/Renderer").Renderer<unknown>): void;

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

    this.world.setResource("EventBus", this.eventBus);
    this.world.setResource("UnifiedInputSystem", this.unifiedInput);

    this._config = config;
    this.currentSeed = (config.gameOptions?.seed as number) ?? RandomService.getInstance("gameplay").nextInt(0, 0xFFFFFFFF);
    RandomService.setSeed(this.currentSeed);
    RandomService.getInstance("gameplay").setSeed(this.currentSeed);

    this.setupLoop();
    this._registerKeyboardListeners();
  }

  private setupLoop(): void {
    /**
     * Deterministic Pipeline (Fixed Update Phase):
     *
     * 1. PRE-UPDATE: Snapshot Transforms for Interpolation.
     * 2. INPUT: Process raw inputs into semantic actions.
     * 3. SIMULATION: Execute game logic and physics systems.
     * 4. POST-UPDATE: Propagate transforms through hierarchy.
     */
    this.gameLoop.subscribeUpdate((deltaTime) => {
      if (this._isPaused) return;

      const activeWorld = this.getWorld();

      // 1. PRE-UPDATE: Snapshot
      const entities = activeWorld.query("Transform");
      for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        const t = activeWorld.getComponent<TransformComponent>(entity, "Transform")!;
        let prev = activeWorld.getComponent<PreviousTransformComponent>(entity, "PreviousTransform");
        if (!prev) {
          prev = activeWorld.addComponent(entity, { type: "PreviousTransform", x: t.x, y: t.y, rotation: t.rotation } as PreviousTransformComponent);
        }
        if (prev) {
          prev.x = t.x;
          prev.y = t.y;
          prev.rotation = t.rotation;
        }
      }

      // 2. INPUT
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

      // 4. POST-UPDATE: Transform Propagation (Hierarchy)
      // Must happen AFTER simulation but BEFORE rendering.
      this.hierarchySystem.update(activeWorld, deltaTime);

      this.currentTick++;
      this._notifyListeners();
    });
  }

  protected abstract registerSystems(): void;
  protected abstract initializeEntities(): void;
  public abstract getGameState(): TState;
  public abstract isGameOver(): boolean;

  public start(): void { this.gameLoop.start(); }
  public stop(): void { this.gameLoop.stop(); }
  public pause(): void { this._isPaused = true; this.sceneManager.pause(); this._notifyListeners(); }
  public resume(): void { this._isPaused = false; this.sceneManager.resume(); this._notifyListeners(); }
  public isPausedState(): boolean { return this._isPaused; }
  public getGameLoop(): GameLoop { return this.gameLoop; }

  public async restart(seed?: number): Promise<void> {
    await this._onBeforeRestart();

    if (seed !== undefined) {
      this.currentSeed = seed;
      RandomService.setSeed(seed);
      RandomService.getInstance("gameplay").setSeed(seed);
    }

    if (this.sceneManager.getCurrentScene()) {
      await this.sceneManager.restartCurrentScene();
    } else {
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
    const scene = this.sceneManager.getCurrentScene();
    return scene ? scene.getWorld() : this.world;
  }

  public getSeed(): number {
    return this.currentSeed;
  }

  /**
   * Inicializa el juego y todos sus subsistemas.
   *
   * @remarks
   * Debe llamarse antes de {@link BaseGame.start}. Registra sistemas base del motor,
   * sistemas específicos del juego y crea las entidades iniciales.
   *
   * @postcondition El {@link World} está poblado y listo para la simulación.
   */
  public async init(): Promise<void> {
    await this.registerEngineSystems();
    this.registerSystems();
    this.initializeEntities();
  }

  protected async registerEngineSystems(): Promise<void> {
    this.world.addSystem(new XPSystem(this.eventBus));
    const profile = await PlayerProfileService.getProfile();
    this.world.addSystem(new PaletteSystem(profile.activePalette));
  }

  protected shouldStallSimulation(): boolean {
    return false;
  }

  public setInput(input: Record<string, boolean>): void {
    Object.entries(input).forEach(([action, pressed]) => {
      this.unifiedInput.setOverride(action, pressed);
    });
  }

  public subscribe(listener: UpdateListener<BaseGame<TState, TInput>>): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  protected _onBeforeRestart(): void | Promise<void> {}

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
    if (e.code === this._config.pauseKey) { if (this._isPaused) this.resume(); else this.pause(); };
    if (e.code === this._config.restartKey) {
      this.restart().catch(console.error);
    }
  }
}
