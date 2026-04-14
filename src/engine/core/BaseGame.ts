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
  gameOptions?: any;
}

/**
 * Orquestador principal del ciclo de vida, estado y ejecución de un juego.
 *
 * @responsibility Coordinar la inicialización del motor (World, Loop, Input).
 * @responsibility Gestionar las fases del pipeline determinista por tick.
 * @responsibility Proveer un punto de entrada para la integración con React Native.
 * @responsibility Administrar el cambio de escenas y el reinicio de estado.
 *
 * @remarks
 * `BaseGame` implementa el patrón de diseño Template Method; las clases derivadas deben
 * implementar {@link BaseGame.registerSystems} e {@link BaseGame.initializeEntities}.
 * El loop de actualización garantiza un pipeline estricto:
 * 1. Preparación de interpolación (Snapshot de transforms previos).
 * 2. Procesamiento de entrada unificada.
 * 3. Actualización de simulación (World o Scene actual).
 * 4. Propagación de jerarquías (Transform updates).
 *
 * @typeParam TState - Representación del estado consolidado del juego.
 * @typeParam TInput - Mapa de acciones de entrada soportadas.
 *
 * @packageDocumentation
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
  protected currentSeed: number = 0;
  public isMultiplayer: boolean;

  private _isPaused = false;
  private _listeners = new Set<UpdateListener<BaseGame<TState, TInput>>>();
  private _globalKeyHandler = (e: KeyboardEvent) => this._handleGlobalKey(e);
  protected _config: BaseGameConfig;
  protected hierarchySystem: HierarchySystem;

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
    this.hierarchySystem = new HierarchySystem();

    this.world.setResource("EventBus", this.eventBus);

    this._config = config;
    this.currentSeed = config.gameOptions?.seed ?? RandomService.getInstance("gameplay").nextInt(0, 0xFFFFFFFF);
    RandomService.setSeed(this.currentSeed);
    RandomService.getInstance("gameplay").setSeed(this.currentSeed);

    this.setupLoop();
    this._registerKeyboardListeners();
  }

  private setupLoop(): void {
    /**
     * Deterministic Pipeline (Update Phase):
     * 1. Interpolation Prep (Snapshot previous state)
     * 2. Input Handling
     * 3. Simulation Update (ECS Systems/Scenes)
     * 4. Transform Propagation (Hierarchy)
     */
    this.gameLoop.subscribeUpdate((deltaTime) => {
      if (this._isPaused) return;

      const activeWorld = this.getWorld();

      // 1. Snapshot Transforms for Interpolation
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

      // 2. Input Handling
      if (this.isMultiplayer) {
        // Multiplayer input logic...
      } else {
        this.unifiedInput.update(activeWorld, deltaTime);
      }

      // 3. Simulation Update
      if (this.sceneManager.getCurrentScene()) {
        this.sceneManager.update(deltaTime);
      } else {
        this.world.update(deltaTime);
      }

      // 4. Transform Propagation Phase (Mandatory)
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

  public async restart(): Promise<void> {
    await this._onBeforeRestart();

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

  /**
   * Inyecta estados de entrada de forma programática utilizando el sistema de overrides.
   *
   * @remarks
   * Utilizado principalmente para controles táctiles de React Native o telemetría de red.
   *
   * @param input - Un objeto parcial con las acciones y su estado booleano.
   * @sideEffect Llama a `unifiedInput.setOverride` para cada acción proporcionada.
   */
  protected shouldStallSimulation(): boolean {
    return false;
  }

  public setInput(input: Record<string, boolean>): void {
    Object.entries(input).forEach(([action, pressed]) => {
      this.unifiedInput.setOverride(action, pressed);
    });
  }

  /**
   * Registra un listener para recibir notificaciones tras cada ciclo de actualización.
   *
   * @param listener - Función callback que recibe la instancia del juego.
   * @returns Función para cancelar la suscripción.
   */
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
