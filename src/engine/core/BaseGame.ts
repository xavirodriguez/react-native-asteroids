import { World, ReadOnlyWorld } from "../core/World";
import { GameLoop } from "./GameLoop";
import { UnifiedInputSystem } from "../input/UnifiedInputSystem";
import { EventBus } from "./EventBus";
import { InputBuffer } from "../network/InputBuffer";
import { NetworkTransport } from "../network/NetworkTransport";
import { ReplayRecorder } from "../debug/ReplayRecorder";
import { SceneManager } from "../scenes/SceneManager";
import { RandomService } from "../utils/RandomService";
import type { IGame, UpdateListener } from "./IGame";
import { XPSystem } from "../systems/XPSystem";
import { PaletteSystem } from "../systems/PaletteSystem";
import { PlayerProfileService } from "../../services/PlayerProfileService";
import { HierarchySystem } from "../systems/HierarchySystem";
import { InterpolationPrepSystem } from "../systems/InterpolationPrepSystem";
import { SystemPhase } from "./System";
import { AssetCleanupSystem } from "../systems/AssetCleanupSystem";
import { AssetLoader } from "../assets/AssetLoader";

export interface BaseGameConfig {
  pauseKey?: string;
  restartKey?: string;
  isMultiplayer?: boolean;
  gameOptions?: Record<string, unknown>;
}

/**
 * Orquestador principal del ciclo de vida y el estado del juego.
 *
 * @remarks
 * Diseñado para implementar un pipeline orientado a la reproducibilidad:
 * 1. INPUT: Captura y procesamiento de comandos.
 * 2. SIMULATION: Ejecución de la lógica de juego y sistemas físicos (Fixed Step).
 * 3. TRANSFORM: Propagación de jerarquías espaciales.
 *
 * La fase de renderizado está desacoplada y gestiona la interpolación visual mediante
 * el valor `alpha` calculado por el {@link GameLoop}.
 *
 * @responsibility Coordinar la inicialización de sistemas y entidades.
 * @responsibility Gestionar las transiciones de pausa y reinicio.
 * @responsibility Proveer acceso unificado al mundo ECS y recursos globales.
 *
 * @conceptualRisk [DETERMINISM][CRITICAL] `currentTick` (number) puede desbordarse tras ~285,000 años,
 * pero los límites de lockstep/buffer podrían verse afectados por la precisión mucho antes.
 * @conceptualRisk [ASYNC_RACE][MEDIUM] Llamar a `start()` antes de que la promesa de `init()`
 * se resuelva puede resultar en una simulación inconsistente.
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

  private _isPaused = false;
  private _listeners = new Set<UpdateListener<BaseGame<TState, TInput>>>();
  private _globalKeyHandler = (e: KeyboardEvent) => this._handleGlobalKey(e);
  protected _config: BaseGameConfig;
  protected hierarchySystem: HierarchySystem;
  protected interpolationPrepSystem: InterpolationPrepSystem;

  public abstract initializeRenderer(renderer: import("../rendering/Renderer").Renderer<unknown>): void;

  constructor(config: BaseGameConfig = {}) {
    const { isMultiplayer = false } = config;
    this.isMultiplayer = isMultiplayer;
    this.world = new World();
    this.gameLoop = new GameLoop();
    this.unifiedInput = new UnifiedInputSystem();
    this.eventBus = new EventBus();
    this.sceneManager = new SceneManager(this.world, (world) => this.registerEssentialSystems(world));
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

    this.setupLoop();
    this._registerKeyboardListeners();
  }

  private setupLoop(): void {
    /**
     * Pipeline orientado al determinismo (Fixed Update Phase):
     *
     * 1. EVENT PROCESSING: Handle deferred events from the previous frame.
     * 2. SIMULATION & PRESENTATION: Process physics, rules, and visuals via phase-gated pipeline.
     */
    this.gameLoop.subscribeUpdate((deltaTime) => {
      if (this._isPaused) return;

      const activeWorld = this.getWorld();

      // 1. EVENT PROCESSING
      this.eventBus.processDeferred();

      // 2. SIMULATION & PRESENTATION
      if (this.sceneManager.getCurrentScene()) {
        this.sceneManager.update(deltaTime);
      } else {
        activeWorld.update(deltaTime);
      }

      this.currentTick++;
      this._notifyListeners();
    });
  }

  protected abstract registerSystems(): void;
  protected abstract initializeEntities(): void;
  public abstract getGameState(): TState;
  public abstract isGameOver(): boolean;

  /**
   * Inicia el ciclo de ejecución del juego.
   * @postcondition El {@link GameLoop} comienza a despachar eventos de actualización.
   */
  public start(): void { this.gameLoop.start(); }

  /**
   * Detiene el ciclo de ejecución del juego de forma inmediata.
   * @postcondition El {@link GameLoop} cesa todas sus actividades.
   */
  public stop(): void { this.gameLoop.stop(); }

  /**
   * Pausa la simulación lógica manteniendo el renderizado activo.
   * @postcondition {@link BaseGame._isPaused} se establece en `true`.
   * @sideEffect Notifica a la escena actual y a los suscriptores externos.
   */
  public pause(): void { this._isPaused = true; this.sceneManager.pause(); this._notifyListeners(); }

  /**
   * Reanuda la simulación lógica tras una pausa.
   * @postcondition {@link BaseGame._isPaused} se establece en `false`.
   * @sideEffect Notifica a la escena actual y a los suscriptores externos.
   */
  public resume(): void { this._isPaused = false; this.sceneManager.resume(); this._notifyListeners(); }

  /** Consulta si el juego se encuentra en estado de pausa. */
  public isPausedState(): boolean { return this._isPaused; }

  /** Proporciona acceso al {@link GameLoop} para suscripciones directas. */
  public getGameLoop(): GameLoop { return this.gameLoop; }

  /**
   * Reinicia el estado del juego, opcionalmente con una nueva semilla aleatoria.
   *
   * @remarks
   * Realiza una limpieza previa mediante `_onBeforeRestart`. Si hay escenas activas,
   * reinicia la escena actual invocando `onRestartCleanup()`; de lo contrario, limpia
   * el mundo y re-inicializa las entidades.
   *
   * @param seed - Semilla opcional para favorecer la repetibilidad en la simulación.
   * @postcondition El juego intenta volver a su estado inicial de simulación.
   * @sideEffect Reinicia el tick de simulación y el estado de pausa.
   * @sideEffect Actualiza la semilla global en {@link RandomService}.
   */
  public async restart(seed?: number): Promise<void> {
    await this._onBeforeRestart();

    if (seed !== undefined) {
      this.currentSeed = seed;
      RandomService.getGameplayRandom().setSeed(this.currentSeed);
      RandomService.getRenderRandom().setSeed(this.currentSeed ^ 0xDEADBEEF);
    }

    if (this.sceneManager.getCurrentScene()) {
      await this.sceneManager.restartCurrentScene();
    } else {
      this.world.clear();
      // Skip system re-registration during restart because systems survive world.clear().
      // We only need to re-register the resources that were cleared.
      this.registerEssentialSystems(this.world, { skipSystems: true });
      this.registerGameResources(this.world);
      this.initializeEntities();
    }

    this._isPaused = false;
    this._notifyListeners();
  }

  /**
   * Libera todos los recursos y detiene el motor de forma definitiva.
   *
   * @remarks
   * Detiene el loop, limpia los listeners de entrada (críticos para evitar fugas),
   * elimina listeners de teclado globales y limpia suscriptores de UI.
   *
   * @precondition Debe llamarse cuando el componente de React que aloja el juego se desmonte.
   */
  public destroy(): void {
    this.stop();
    this.unifiedInput.cleanup();
    this._unregisterKeyboardListeners();
    this._listeners.clear();
  }

  /**
   * Devuelve el mundo ECS activo (ya sea el global o el de la escena actual).
   *
   * @remarks
   * Es la fuente de verdad preferida para que los componentes externos (como el Renderer)
   * consulten el estado de las entidades.
   *
   * @returns La instancia de {@link World} activa.
   */
  public getWorld(): World {
    const scene = this.sceneManager.getCurrentScene();
    return scene ? scene.getWorld() : this.world;
  }

  public getSeed(): number {
    return this.currentSeed;
  }

  /**
   * Inicializa el juego y todos sus subsistemas de forma asíncrona.
   *
   * @remarks
   * Debe llamarse obligatoriamente antes de {@link BaseGame.start}. Registra los sistemas
   * core del motor (XP, Paleta), los sistemas específicos del juego mediante {@link BaseGame.registerSystems}
   * e inicializa las entidades base mediante {@link BaseGame.initializeEntities}.
   *
   * @postcondition El {@link World} está configurado con sistemas y entidades iniciales.
   * @conceptualRisk [ASYNC_RACE][MEDIUM] Llamar a `start()` antes de que la promesa de `init()`
   * se resuelva puede resultar en una simulación sin sistemas o entidades.
   */
  public async init(): Promise<void> {
    await this.registerEngineSystems();
    this.registerSystems();
    this.initializeEntities();
  }

  protected async registerEngineSystems(): Promise<void> {
    this.registerEssentialSystems(this.world);
    this.registerGameResources(this.world);

    this.world.addSystem(new XPSystem(this.eventBus), { phase: SystemPhase.GameRules });
    const profile = await PlayerProfileService.getProfile();
    this.world.addSystem(new PaletteSystem(profile.activePalette), { phase: SystemPhase.Presentation });

    // Register AssetCleanupSystem if AssetLoader is available
    const assetLoader = this.world.getResource<AssetLoader>("AssetLoader");
    if (assetLoader) {
      this.world.addSystem(new AssetCleanupSystem(assetLoader, this.eventBus), { phase: SystemPhase.Simulation });
    }
  }

  /**
   * Registra los recursos y sistemas esenciales en un mundo (base o de escena).
   * @param world - El mundo donde registrar los elementos.
   * @param options - Opciones para controlar el registro.
   */
  protected registerEssentialSystems(world: World, options: { skipSystems?: boolean } = {}): void {
    world.setResource("EventBus", this.eventBus);
    world.setResource("UnifiedInputSystem", this.unifiedInput);

    if (!options.skipSystems) {
      world.addSystem(this.interpolationPrepSystem, { phase: SystemPhase.Input, priority: 1000 });
      world.addSystem(this.unifiedInput, { phase: SystemPhase.Input });
      world.addSystem(this.hierarchySystem, { phase: SystemPhase.PostSimulation });
    }
  }

  /**
   * Hook para que las subclases registren recursos específicos del juego.
   * Se llama durante la inicialización y tras un reinicio del mundo.
   * @param world - El mundo donde registrar los recursos.
   */
  protected registerGameResources(world: World): void {
    // Implementado por subclases
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

  /**
   * Genera una semilla externa al stream de gameplay para la inicialización.
   * Evita consumir el stream de gameplay antes de que sea sembrado formalmente.
   */
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
    if (e.code === this._config.pauseKey) { if (this._isPaused) this.resume(); else this.pause(); };
    if (e.code === this._config.restartKey) {
      this.restart().catch(console.error);
    }
  }
}
