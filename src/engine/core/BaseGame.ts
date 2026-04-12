import { World } from "../core/World";
import { GameLoop } from "./GameLoop";
import { UnifiedInputSystem } from "../input/UnifiedInputSystem";
import { EventBus } from "./EventBus";
import { InputBuffer } from "../network/InputBuffer";
import { NetworkTransport } from "../network/NetworkTransport";
import { ReplayRecorder } from "../debug/ReplayRecorder";
import { SceneManager } from "../scenes/SceneManager";
import { runLifecycleAsync } from "../utils/LifecycleUtils";
import { RandomService } from "../utils/RandomService";
import { InputStateComponent, PreviousTransformComponent, TransformComponent } from "./CoreComponents";
import type { IGame, UpdateListener } from "./IGame";
import { XPSystem } from "../systems/XPSystem";
import { PaletteSystem } from "../systems/PaletteSystem";
import { MutatorSystem } from "../systems/MutatorSystem";
import { PlayerProfileService } from "../../services/PlayerProfileService";
import { MutatorService } from "../../services/MutatorService";
import { HierarchySystem } from "../systems/HierarchySystem";

export interface BaseGameConfig {
  pauseKey?: string;
  restartKey?: string;
  isMultiplayer?: boolean;
  gameOptions?: any;
}

/**
 * Orquestador principal del ciclo de vida y estado de un videojuego.
 *
 * @remarks
 * BaseGame proporciona la infraestructura necesaria para gestionar el mundo ECS,
 * el loop de juego, la entrada de usuario, la persistencia y el determinismo.
 * Actúa como el punto de entrada para cada juego específico (Asteroids, Pong, etc.).
 *
 * El pipeline de actualización sigue un orden estricto:
 * 1. Preparación de interpolación (Snapshot de transformaciones).
 * 2. Procesamiento de Input.
 * 3. Actualización de Sistemas y Escena.
 * 4. Propagación de Jerarquías.
 *
 * @conceptualRisk [SINGLETON_DRIFT][MEDIUM] El uso de `RandomService.setSeed` a nivel global
 * puede afectar a otros componentes si no se maneja con cuidado en entornos con múltiples
 * instancias de juego.
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
  protected hierarchySystem: HierarchySystem;
  public isMultiplayer: boolean;

  private _isPaused = false;
  private _listeners = new Set<UpdateListener<BaseGame<TState, TInput>>>();
  private _globalKeyHandler = (e: KeyboardEvent) => this._handleGlobalKey(e);
  protected _config: BaseGameConfig;
  protected currentSeed: number;

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
     * Pipeline Determinista (Update Phase):
     * 1. Capture/Snapshot Previous State
     * 2. Input Handling
     * 3. Simulation Update (ECS Systems)
     * 4. Transform Propagation (Mandatory)
     */
    this.gameLoop.subscribeUpdate((deltaTime) => {
      if (this._isPaused) return;

      const activeWorld = this.getWorld();

      // 1. Snapshot Transforms for Interpolation (Prevents render drift)
      const entities = activeWorld.query("Transform");
      for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        const t = activeWorld.getComponent<TransformComponent>(entity, "Transform")!;
        let prev = activeWorld.getComponent<PreviousTransformComponent>(entity, "PreviousTransform");
        if (!prev) {
          prev = activeWorld.addComponent(entity, { type: "PreviousTransform", x: t.x, y: t.y, rotation: t.rotation });
        }
        prev.x = t.x;
        prev.y = t.y;
        prev.rotation = t.rotation;
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

      // 4. Transform Propagation Phase
      this.hierarchySystem.update(activeWorld, deltaTime);

      this.currentTick++;
      this._notifyListeners();
    });
  }

  protected abstract registerSystems(): void;
  protected abstract initializeEntities(): void;
  public abstract getGameState(): TState;
  public abstract isGameOver(): boolean;

  /**
   * Inicia el loop de juego.
   */
  public start(): void { this.gameLoop.start(); }

  /**
   * Detiene el loop de juego.
   */
  public stop(): void { this.gameLoop.stop(); }

  /**
   * Pausa la simulación.
   *
   * @remarks
   * Los sistemas de la escena actual también son pausados. Se notifica a los suscriptores
   * de la UI para reflejar el estado de pausa.
   */
  public pause(): void { this._isPaused = true; this.sceneManager.pause(); this._notifyListeners(); }

  /**
   * Reanuda la simulación.
   */
  public resume(): void { this._isPaused = false; this.sceneManager.resume(); this._notifyListeners(); }

  /**
   * Reinicia el estado del juego de forma asíncrona.
   *
   * @remarks
   * Realiza una limpieza completa del mundo ECS o de la escena actual y vuelve a
   * invocar {@link BaseGame.initializeEntities}.
   *
   * @postcondition El juego se reanuda automáticamente si estaba pausado.
   * @sideEffect Llama a {@link BaseGame._onBeforeRestart} para limpieza específica de la subclase.
   */
  public async restart(): Promise<void> {
    await runLifecycleAsync(async () => {
        await this._onBeforeRestart();
    });

    if (this.sceneManager.getCurrentScene()) {
      await this.sceneManager.restartCurrentScene();
    } else {
      this.world.clear();
      this.initializeEntities();
    }
    if (this._isPaused) this.resume();
    this._notifyListeners();
  }

  /**
   * Libera todos los recursos y detiene los procesos del juego.
   *
   * @remarks
   * Es fundamental llamar a este método al desmontar el componente de React para
   * evitar fugas de memoria por listeners globales (teclado, puntero) y timers.
   *
   * @postcondition {@link BaseGame.gameLoop} se detiene.
   * @postcondition Los listeners de entrada se eliminan.
   */
  public destroy(): void {
    this.stop();
    this.unifiedInput.cleanup();
    this._unregisterKeyboardListeners();
    this._listeners.clear();
  }

  /**
   * Obtiene el mundo ECS activo.
   *
   * @remarks
   * Si hay una escena activa, devuelve el mundo de la escena; de lo contrario,
   * devuelve el mundo global del juego.
   *
   * @returns La instancia de {@link World} actual.
   */
  public getWorld(): World {
    const scene = this.sceneManager.getCurrentScene();
    return scene ? scene.getWorld() : this.world;
  }

  /**
   * Inicializa el motor y el contenido del juego.
   *
   * @remarks
   * Debe llamarse antes de {@link BaseGame.start}. Registra los sistemas base del motor,
   * los sistemas específicos del juego y crea las entidades iniciales.
   *
   * @precondition Los servicios externos (como PlayerProfileService) deben estar disponibles.
   * @postcondition El juego está listo para comenzar la simulación.
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

  public setInput(input: Partial<TInput>): void {
    Object.entries(input).forEach(([action, val]) => {
      this.unifiedInput.setOverride(action, val as boolean);
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
    if (typeof window !== "undefined") window.addEventListener("keydown", this._globalKeyHandler);
  }

  private _unregisterKeyboardListeners(): void {
    if (typeof window !== "undefined") window.removeEventListener("keydown", this._globalKeyHandler);
  }

  private _handleGlobalKey(e: KeyboardEvent): void {
    if (e.code === this._config.pauseKey) this._isPaused ? this.resume() : this.pause();
    if (e.code === this._config.restartKey) {
      this.restart().catch(console.error);
    }
  }
}
