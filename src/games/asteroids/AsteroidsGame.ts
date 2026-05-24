import { World } from "../../engine/core/World";
import { GameLoop } from "../../engine/core/GameLoop";
/* eslint-disable @typescript-eslint/no-require-imports */
import { BaseGame } from "../../engine/core/BaseGame";
import { AssetLoader } from "../../engine/assets/AssetLoader";
import { AsteroidGameStateSystem } from "./systems/AsteroidGameStateSystem";
import { AsteroidRenderSystem } from "./systems/AsteroidRenderSystem";
import { AsteroidComboSystem } from "./systems/AsteroidComboSystem";
import { AsteroidInputSystem } from "./systems/AsteroidInputSystem";
import { UfoSystem } from "./systems/UfoSystem";
import { LootSystem } from "../../engine/systems/LootSystem";
import { ModifierSystem } from "../../engine/systems/ModifierSystem";
import { PowerUpSystem } from "../../engine/systems/PowerUpSystem";
import { JuiceSystem } from "../../engine/systems/JuiceSystem";
import { MutatorSystem } from "../../engine/systems/MutatorSystem";
import { SpatialPartitioningSystem } from "../../engine/systems/SpatialPartitioningSystem";
import { RenderUpdateSystem } from "../../engine/systems/RenderUpdateSystem";
import { MovementSystem } from "../../engine/physics/systems/MovementSystem";
import { BoundarySystem } from "../../engine/physics/systems/BoundarySystem";
import { FrictionSystem } from "../../engine/physics/systems/FrictionSystem";
import { ScreenShakeSystem } from "../../engine/systems/ScreenShakeSystem";
import { JoystickSystem } from "../../engine/systems/JoystickSystem";
import { AsteroidCollisionSystem } from "./systems/AsteroidCollisionSystem";
import { ShipControlSystem } from "./systems/ShipControlSystem";
import { TTLSystem } from "../../engine/systems/TTLSystem";
import { CollisionSystem2D } from "../../engine/physics/collision/CollisionSystem2D";
import { CCDSystem } from "../../engine/physics/collision/CCDSystem";
import { FeedbackSystem } from "../../engine/systems/FeedbackSystem";
import { type GameStateComponent, type InputState, INITIAL_GAME_STATE } from "./types/AsteroidTypes";
import { MutatorService } from "../../services/MutatorService";
import { InputFrame } from "../../multiplayer/NetTypes";
import type { IAsteroidsGame } from "./types/GameInterfaces";
import { BulletPool, ParticlePool } from "./EntityPool";
import { Renderer } from "../../engine/rendering/Renderer";
import { initializeAsteroidsRenderer } from "./rendering/AsteroidsRendererManager";
import { NetworkManager } from "../../engine/network/NetworkManager";
import { ReplicationSystem } from "../../engine/network/systems/ReplicationSystem";
import { INetworkGame } from "../../engine/network/types/NetworkTypes";
import { ConfigService } from "../../engine/services/ConfigService";
import { NetworkReplicationUtils } from "../../engine/network/NetworkReplicationUtils";
import { AsteroidConfigSchema, AsteroidConfig } from "./types/AsteroidConfigSchema";
import { SystemPhase } from "../../engine/core/System";
import { ComponentCloner } from "../../engine/core/ComponentCloner";

const __DEV__ = process.env.NODE_ENV !== "production";

/**
 * Main game controller for Asteroids.
 * Manages the ECS world, systems, and lifecycle.
 */
export class AsteroidsGame
  extends BaseGame<GameStateComponent, InputState>
  implements IAsteroidsGame, INetworkGame {

  private gameStateSystem: AsteroidGameStateSystem;
  private assetLoader: AssetLoader;
  private bulletPool: BulletPool;
  private particlePool: ParticlePool;
  private networkManager: NetworkManager;
  private lastProcessedFullStateVersion = -1;
  public readonly gameId = "asteroids";
  private config: AsteroidConfig;

  constructor(config: { isMultiplayer?: boolean, seed?: number, gameOptions?: Record<string, unknown>, headless?: boolean } = {}) {
    const seed = config.gameOptions?.seed as number || config.seed;
    const rawConfig = require("./config/asteroids.json");
    super({
      pauseKey: rawConfig.KEYS.PAUSE,
      restartKey: rawConfig.KEYS.RESTART,
      isMultiplayer: config.isMultiplayer,
      gameOptions: { ...config.gameOptions, seed },
      headless: config.headless
    });
  }

  public override async init(): Promise<void> {
    const rawConfig = require("./config/asteroids.json");
    const baseConfig = ConfigService.load(this.gameId, AsteroidConfigSchema, rawConfig);

    const mutators = MutatorService.getActiveMutatorsForGame(this.gameId);
    const enabled = await MutatorService.isMutatorModeEnabled();
    this.config = enabled
      ? mutators.reduce((cfg, m) => m.apply(cfg), { ...baseConfig })
      : { ...baseConfig };

    this.world.setResource("GameConfig", this.config);
    this._config.gameOptions = { ...this._config.gameOptions, ...this.config };

    if (!this.isHeadless) {
        await this.onPreloadAssets();
    }
    await super.init();
  }

  /**
   * Preloads game assets (SFX and Textures) to prevent cold-start latency.
   */
  private async onPreloadAssets(): Promise<void> {
    const audio = this.audio;
    const loader = this.assetLoader;
    try {
      // 1. Load Audio via AudioSystem (now supports modules)
      const audioPromise = Promise.all([
        audio.loadSFX("explosion", { module: require("../../../assets/audio/explosion.mp3") }),
        audio.loadSFX("hit", { module: require("../../../assets/audio/hit.mp3") }),
        audio.loadSFX("shoot", { module: require("../../../assets/audio/shoot.mp3") }),
        audio.loadSFX("game_over", { module: require("../../../assets/audio/game_over.mp3") }),
      ]);

      // 2. Load Textures via AssetLoader
      loader.queueAssets([
        { id: "ship_sprite", type: "texture", module: require("../../../assets/ship.png") }
      ]);
      const loaderPromise = loader.loadAll();

      await Promise.all([audioPromise, loaderPromise]);
    } catch (e) {
      console.warn("[Asteroids] Asset preloading failed. Visuals or Audio may lag.", e);
    }
  }

  public setMultiplayerMode(active: boolean) {
    this.isMultiplayer = active;
  }

  /**
   * Applies an input frame to a specific player ship entity.
   * Side-effect free (only mutates the component data in the world).
   */
  public applyInputToEntity(entityId: number, input: InputFrame) {
    this.world.mutateComponent<import("./types/AsteroidTypes").InputComponent>(entityId, "Input", inputComp => {
      inputComp.rotateLeft = input.actions.includes("rotateLeft") || (input.axes?.rotate_left ?? 0) > 0;
      inputComp.rotateRight = input.actions.includes("rotateRight") || (input.axes?.rotate_right ?? 0) > 0;
      inputComp.thrust = input.actions.includes("thrust") || (input.axes?.thrust ?? 0) > 0;
      inputComp.shoot = input.actions.includes("shoot");
      inputComp.hyperspace = input.actions.includes("hyperspace");
      inputComp.rotationAmount = input.axes?.horizontal ?? 0;
      if (inputComp.rotateLeft && Math.abs(inputComp.rotationAmount) < 0.1) inputComp.rotationAmount = -1;
      if (inputComp.rotateRight && Math.abs(inputComp.rotationAmount) < 0.1) inputComp.rotationAmount = 1;
    });
  }


  /**
   * Performs local player movement prediction using the shared simulation.
   *
   * @remarks
   * Aims to support visual consistency by preemptively executing simulation logic on the client.
   */
  public predictLocalPlayer(input: InputFrame, deltaTime: number) {
    const localPlayer = this.world.query("LocalPlayer")[0];
    if (localPlayer !== undefined) {
      this.applyInputToEntity(localPlayer, input);
    }

    // Actual simulation step
    this.runSimulationStep(deltaTime, false);

    if (this.isMultiplayer) {
      const strategy = this.networkManager.getStrategy();
      if (strategy.recordPrediction) {
        strategy.recordPrediction(input, this.world);
      }
    }
  }

  /**
   * Runs a single deterministic simulation step.
   * Internal API used by prediction, reconciliation and replay.
   *
   * @remarks
   * Migrated to pure ECS pipeline. DeterministicSimulation is deprecated.
   */
  public runSimulationStep(deltaTime: number, _isResimulating: boolean) {
    this.world.update(deltaTime);
  }

  /**
   * Manejador principal de actualizaciones de estado multijugador.
   *
   * @remarks
   * Procesa snapshots completos y deltas parciales para mantener la coherencia con el servidor:
   * 1. **Snapshot Integration**: Si el estado es un delta, lo integra en una copia del mundo.
   * 2. **Reconciliation (Reconciliación)**:
   *    - Restaura el estado autoritativo del servidor en el tick especificado.
   *    - Vuelve a ejecutar la simulación localmente para todos los ticks transcurridos
   *      desde el `serverTick` hasta el tick actual del cliente, aplicando el buffer de inputs local.
   * 3. **Error Smoothing**: Si la posición resultante difiere de la visual, se aplica un
   *    `VisualOffset` que se interpola a cero progresivamente (via `JuiceSystem`) para evitar "saltos" visuales.
   *
   * @param serverState - El objeto de estado recibido del hook `useMultiplayer`.
   * @param localSessionId - ID de sesión del jugador local para identificar su entidad.
   */
  public updateFromServer(serverState: Record<string, unknown>, localSessionId?: string) {
    if (!this.isMultiplayer || !serverState) return;

    // Prefer delta update if available (more frequent and granular)
    if (serverState.delta) {
        this.handleDeltaServerUpdate(serverState, localSessionId);
    } else if (serverState.fullWorldState) {
        // Fallback to full snapshot only if no delta is present
        this.handleFullServerUpdate(serverState, localSessionId);
    }
  }

  private handleDeltaServerUpdate(serverState: Record<string, unknown>, localSessionId?: string) {
    const serverTick = serverState.tick as number;
    const delta = serverState.delta as Partial<import("../../engine/types/EngineTypes").WorldSnapshot>;

    let authoritativeSnapshot: import("../../engine/types/EngineTypes").WorldSnapshot;

    if (delta.created || delta.updated || delta.removed) {
      const strategy = this.networkManager.getStrategy();
      const baseSnapshot = strategy.getStateHistory ? strategy.getStateHistory(serverState.baselineTick as number) : undefined;
      if (baseSnapshot) {
        // Safe integration of delta into a base snapshot
        authoritativeSnapshot = this.applyDeltaToSnapshot(baseSnapshot, delta);
      } else {
        return; // Cannot apply delta without base
      }
    } else {
      // If it's a full snapshot sent as a delta, deep clone it for safety
      authoritativeSnapshot = ComponentCloner.deepCloneSnapshot(delta as import("../../engine/types/EngineTypes").WorldSnapshot);
    }

    this.networkManager.processServerUpdate(serverTick, authoritativeSnapshot, localSessionId);

    const eventBus = this.world.getResource<import("../../engine/core/EventBus").EventBus>("EventBus");
    if (eventBus && delta.stateVersion !== undefined) {
      eventBus.emitDeferred("net:ack_version", { version: delta.stateVersion, tick: serverTick });
    }
  }

  /**
   * Safely integrates a delta into a base snapshot using deep cloning.
   */
  private applyDeltaToSnapshot(
    base: import("../../engine/types/EngineTypes").WorldSnapshot,
    delta: import("../../engine/network/types/ReplicationTypes").DeltaPacket
  ): import("../../engine/types/EngineTypes").WorldSnapshot {
    // 1. Create a deep clone of the base state to avoid aliasing with history
    const snapshot = ComponentCloner.deepCloneSnapshot(base);

    // 2. Apply the delta safely
    NetworkReplicationUtils.applyDelta(snapshot, delta);

    return snapshot;
  }

  private handleFullServerUpdate(serverState: Record<string, unknown>, localSessionId?: string) {
    let authoritativeSnapshot: import("../../engine/types/EngineTypes").WorldSnapshot;

    if (typeof serverState.fullWorldState === "string") {
      authoritativeSnapshot = JSON.parse(serverState.fullWorldState);
    } else {
      // Use ComponentCloner for consistent deep cloning
      authoritativeSnapshot = ComponentCloner.deepCloneSnapshot(serverState.fullWorldState as import("../../engine/types/EngineTypes").WorldSnapshot);
    }

    if (authoritativeSnapshot.stateVersion === this.lastProcessedFullStateVersion) return;
    this.lastProcessedFullStateVersion = authoritativeSnapshot.stateVersion;

    const serverTick = serverState.serverTick as number;
    this.networkManager.processServerUpdate(serverTick, authoritativeSnapshot, localSessionId);
  }

  protected registerSystems(): void {
    // Initialize pools here because super() calls this before the constructor finishes
    if (!this.bulletPool) this.bulletPool = new BulletPool();
    if (!this.particlePool) this.particlePool = new ParticlePool();
    if (!this.assetLoader) this.assetLoader = new AssetLoader();

    if (this.isMultiplayer && !this.networkManager) {
      this.networkManager = NetworkManager.registerGame(this.gameId, this, {}, {
        strategy: 'full',
        interpolationDelay: 100
      });
    }

    this.world.setResource("BulletPool", this.bulletPool);
    this.world.setResource("AssetLoader", this.assetLoader);

    // Configure UnifiedInputSystem bindings
    this.unifiedInput.bind("thrust", [this.config.KEYS.THRUST]);
    this.unifiedInput.bind("rotateLeft", [this.config.KEYS.ROTATE_LEFT]);
    this.unifiedInput.bind("rotateRight", [this.config.KEYS.ROTATE_RIGHT]);
    this.unifiedInput.bind("shoot", [this.config.KEYS.SHOOT]);
    this.unifiedInput.bind("hyperspace", [this.config.KEYS.HYPERSPACE]);

    const inputSys = new AsteroidInputSystem(this.bulletPool, this.particlePool, this.config);
    if (this.isMultiplayer) inputSys.setMultiplayerMode(true);
    this.gameStateSystem = new AsteroidGameStateSystem(this);
    const comboSys = new AsteroidComboSystem();

    this.world.addSystem(this.unifiedInput, { phase: SystemPhase.Input });
    this.world.addSystem(new JoystickSystem(), { phase: SystemPhase.Input });
    this.world.addSystem(inputSys, { phase: SystemPhase.Simulation });
    this.world.addSystem(new ShipControlSystem(this.config), { phase: SystemPhase.Simulation });
    this.world.addSystem(new MovementSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new BoundarySystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new FrictionSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new CCDSystem(), { phase: SystemPhase.Simulation, priority: -10 }); // Ejecutar después de Movement
    this.world.addSystem(new CollisionSystem2D(), { phase: SystemPhase.Collision });
    this.world.addSystem(new AsteroidCollisionSystem(this.particlePool), { phase: SystemPhase.GameRules });
    this.world.addSystem(comboSys, { phase: SystemPhase.Simulation });
    this.world.addSystem(new TTLSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(this.gameStateSystem, { phase: SystemPhase.GameRules });
    this.world.addSystem(new UfoSystem(), { phase: SystemPhase.Simulation });

    this.world.addSystem(new SpatialPartitioningSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new LootSystem(), { phase: SystemPhase.GameRules });
    this.world.addSystem(new PowerUpSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new ModifierSystem(), { phase: SystemPhase.Simulation });

    const activeMutators = MutatorService.getActiveMutatorsForGame(this.gameId);
    this.world.addSystem(new MutatorSystem(activeMutators), { phase: SystemPhase.Simulation });

    if (!this.isHeadless) {
      this.world.addSystem(new ScreenShakeSystem(), { phase: SystemPhase.Presentation });
      this.world.addSystem(new FeedbackSystem(), { phase: SystemPhase.Presentation });
      this.world.addSystem(new JuiceSystem(), { phase: SystemPhase.Presentation });
      this.world.addSystem(new RenderUpdateSystem(), { phase: SystemPhase.Presentation }); // Handle rotation/hit flash
      this.world.addSystem(new AsteroidRenderSystem(this.config.TRAIL_MAX_LENGTH), { phase: SystemPhase.Presentation }); // Handle trails
    }

    if (this.isMultiplayer) {
      this.world.addSystem(new ReplicationSystem(this.networkManager), { phase: SystemPhase.Presentation });
    }
  }

  protected initializeEntities(): void {
    if (this.isMultiplayer) return;

    const { world, config } = this;

    const { createGameState, createShip, spawnAsteroidWave } = require("./EntityFactory");

    createGameState({ world });
    createShip({
      world,
      x: config.SCREEN_CENTER_X,
      y: config.SCREEN_CENTER_Y,
    });
    spawnAsteroidWave({
      world,
      count: config.INITIAL_ASTEROID_COUNT,
    });
  }

  /**
   * Registers game-specific rendering logic to the provided renderer.
   */
  public initializeRenderer(renderer: Renderer<unknown>): void {
    if (this.isHeadless) return;
    initializeAsteroidsRenderer(renderer);
  }

  protected _onBeforeRestart(): void {
    this.gameStateSystem.resetGameOverState(this.world);
    if (this.isMultiplayer) {
      this.networkManager.reset();
    }
    this.lastProcessedFullStateVersion = -1;
  }

  public getGameState(): GameStateComponent {
    const state = this.getWorld().getSingleton<GameStateComponent>("GameState");
    return state ? { ...state } : INITIAL_GAME_STATE;
  }

  public isGameOver(): boolean {
    return this.gameStateSystem.isGameOver();
  }

}

export class NullAsteroidsGame implements IAsteroidsGame {
  private _world = new World();
  private _loop = new GameLoop();
  public start() {} public stop() {} public pause() {} public resume() {}
  public async restart() {} public destroy() {}
  public getWorld() { return this._world; }
  public getGameLoop() { return this._loop; }
  public isPausedState() { return false; }
  public isGameOver() { return false; }
  public getGameState() { return INITIAL_GAME_STATE; }
  public getSeed() { return 0; }
  public setInput() {}
  public subscribe(_listener: import("../../engine/core/IGame").UpdateListener<unknown>) { return () => {}; }
  public initializeRenderer() {}
}
