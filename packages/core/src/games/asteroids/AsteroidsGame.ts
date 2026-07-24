import { World } from "../../ecs/World";
import { GameLoop } from "../../loop/GameLoop";
import { BaseGame, BaseGameConfig } from "../../runtime/BaseGame";
import { AssetLoader } from "../../assets/AssetLoader";
/* eslint-disable @typescript-eslint/no-require-imports */
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "./types/AsteroidRegistry";
import { AsteroidGameStateSystem } from "./systems/AsteroidGameStateSystem";
import { AsteroidInputSystem } from "./systems/AsteroidInputSystem";
import { LootSystem } from "../arcade/systems/LootSystem";
import { PowerUpSystem } from "../arcade/systems/PowerUpSystem";
import { JuiceSystem } from "../../systems/JuiceSystem";
import { MutatorSystem } from "../../systems/MutatorSystem";
import { SpatialPartitioningSystem } from "../../systems/SpatialPartitioningSystem";
import { SpatialCullingSystem } from "../../systems/SpatialCullingSystem";
import { RenderUpdateSystem } from "../../systems/RenderUpdateSystem";
import { MovementSystem } from "../../physics/systems/MovementSystem";
import { BoundarySystem } from "../../physics/systems/BoundarySystem";
import { FrictionSystem } from "../../physics/systems/FrictionSystem";
import { ScreenShakeSystem } from "../../systems/ScreenShakeSystem";
import { JoystickSystem } from "../../systems/JoystickSystem";
import { AsteroidCollisionSystem } from "./systems/AsteroidCollisionSystem";
import { TTLSystem } from "../../systems/TTLSystem";
import { CollisionSystem2D, CCDSystem } from "../../physics/collision/CollisionSystems";
import { FeedbackSystem } from "../../systems/FeedbackSystem";
import { INITIAL_GAME_STATE } from "./types/AsteroidTypes";
import { createShip, spawnAsteroidWave } from "./EntityFactory";
import { InputFrame } from "../../network/NetTypes";
import type { IAsteroidsGame } from "./types/GameInterfaces";
import { BulletPool, ParticlePool } from "./EntityPool";
import { Renderer } from "../../rendering/Renderer";
import { initializeAsteroidsRenderer } from "./rendering/AsteroidsRendererManager";
import { NetworkManager } from "../../network/NetworkManager";
import { NullTransport } from "../../network/NullTransport";
import { LocalPredictionSystem } from "../../network/LocalPredictionSystem";
import { RemoteInterpolationSystem } from "../../network/RemoteInterpolationSystem";
import { NetworkController } from "../../network/NetworkController";
import { computeShipPhysics } from "./utils/AsteroidPhysics";
import { INetworkGame } from "../../network/NetworkManager";
import { ConfigService } from "../../config/ConfigService";
import { AsteroidConfigSchema, AsteroidConfig } from "./types/AsteroidConfigSchema";
import { SystemPhase } from "../../ecs/System";
import { GameStateComponent, InputState } from "./types/AsteroidTypes";

const __DEV__ = process.env.NODE_ENV !== "production";

/**
 * Main game controller for Asteroids.
 * Manages the ECS world, systems, and lifecycle.
 * @public
 */
export class AsteroidsGame
  extends BaseGame<GameStateComponent, InputState, AsteroidsComponentRegistry, AsteroidsEventRegistry>
  implements IAsteroidsGame, INetworkGame {

  private gameStateSystem!: AsteroidGameStateSystem;
  private assetLoader!: AssetLoader;
  private bulletPool!: BulletPool;
  private particlePool!: ParticlePool;
  private network!: NetworkController<AsteroidsComponentRegistry>;
  public readonly gameId = "asteroids";
  private config: AsteroidConfig;
  private resizeListener?: () => void;
  private isHeadless: boolean;

  public get networkManager(): NetworkManager | undefined { return this.network.networkManager; }
  public set networkManager(val: NetworkManager | undefined) { this.network.networkManager = val; }
  public get lastProcessedFullStateVersion(): number { return this.network.lastProcessedFullStateVersion; }
  public set lastProcessedFullStateVersion(val: number) { this.network.lastProcessedFullStateVersion = val; }
  public get isMultiplayer(): boolean { return this.network.isMultiplayer; }
  public set isMultiplayer(val: boolean) { this.network.isMultiplayer = val; }

  constructor(config: BaseGameConfig = {}) {
    super(config);
    this.isHeadless = config.headless || false;
    this.network = new NetworkController<AsteroidsComponentRegistry>(this.world);
    this.isMultiplayer = config.isMultiplayer || false;
    const rawConfig = require("./config/asteroids.json");
    this.config = rawConfig;
  }

  protected override async onRegisterSystems(): Promise<void> {
    const rawConfig = require("./config/asteroids.json");
    const baseConfig = ConfigService.load<AsteroidConfig>(this.gameId, AsteroidConfigSchema, rawConfig);

    const mutators = (this._config.gameOptions?.mutators as any[]) || [];
    this.config = mutators.reduce((cfg, m) => m.apply(cfg), { ...baseConfig } as any);

    this.world.setResource("GameConfig", this.config);
    this.updateScreenConfig();

    if (typeof window !== "undefined") {
        this.resizeListener = () => this.updateScreenConfig();
        window.addEventListener("resize", this.resizeListener);
    }

    if (!this.isHeadless) {
        await this.onPreloadAssets();
    }

    if (!this.bulletPool) this.bulletPool = new BulletPool();
    if (!this.particlePool) this.particlePool = new ParticlePool();
    if (!this.assetLoader) this.assetLoader = new AssetLoader();

    if (!this.networkManager) {
      this.networkManager = NetworkManager.registerGame(this.gameId, this, {
        strategy: 'full',
        interpolationDelay: 100,
        transport: this.isMultiplayer ? undefined : new NullTransport()
      });
    } else if (!this.isMultiplayer) {
      this.networkManager.setTransport(new NullTransport());
    }

    this.world.setResource("BulletPool", this.bulletPool);
    this.world.setResource("AssetLoader", this.assetLoader);

    this.gameStateSystem = new AsteroidGameStateSystem(this);

    this.world.setResource("SpatialCullingEnabled", true);

    this.world.addSystem(new JoystickSystem(), { phase: SystemPhase.Input });
    this.world.addSystem(new SpatialCullingSystem({ margin: 100 }), { phase: SystemPhase.Simulation, priority: 100 });
    this.world.addSystem(new AsteroidInputSystem(this.config), { phase: SystemPhase.Simulation });
    this.world.addSystem(new MovementSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new BoundarySystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new FrictionSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new CCDSystem(), { phase: SystemPhase.Simulation, priority: -10 });
    this.world.addSystem(new CollisionSystem2D(), { phase: SystemPhase.Collision });
    this.world.addSystem(new AsteroidCollisionSystem(), { phase: SystemPhase.GameRules });
    this.world.addSystem(new TTLSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(this.gameStateSystem, { phase: SystemPhase.GameRules });

    this.world.addSystem(new SpatialPartitioningSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new LootSystem(), { phase: SystemPhase.GameRules });
    this.world.addSystem(new PowerUpSystem(), { phase: SystemPhase.Simulation });

    const activeMutators = (this._config.gameOptions?.mutators as any[]) || [];
    this.world.addSystem(new MutatorSystem(activeMutators), { phase: SystemPhase.Simulation });

    if (!this.isHeadless) {
      this.world.addSystem(new ScreenShakeSystem(), { phase: SystemPhase.Presentation });
      this.world.addSystem(new FeedbackSystem(), { phase: SystemPhase.Presentation });
      this.world.addSystem(new JuiceSystem(), { phase: SystemPhase.Presentation });
      this.world.addSystem(new RenderUpdateSystem(), { phase: SystemPhase.Presentation });
    }

    if (this.networkManager) {
      this.world.addSystem(new LocalPredictionSystem(this.networkManager), { phase: SystemPhase.Input });
      this.world.addSystem(new RemoteInterpolationSystem(this.networkManager), { phase: SystemPhase.Presentation });
    }
  }

  protected override async onInitializeEntities(): Promise<void> {
    if (this.isMultiplayer) return;

    // Temporarily unlock gameplayRandom for spawning initialization
    this.world.gameplayRandom.unlock();

    try {
        // Create GameState entity
        const gameStateEntity = this.world.createEntity();
        this.world.addComponent(gameStateEntity, {
            type: "GameState",
            score: 0,
            level: 1,
            lives: 3,
            isGameOver: false
        } as GameStateComponent);

        // Create Player Ship
        const screen = this.world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
        const ship = createShip({
            world: this.world,
            x: screen.width / 2,
            y: screen.height / 2
        });

        // Add LocalPlayer and Input components to the ship
        this.world.addComponent(ship, { type: "LocalPlayer" } as any);
        this.world.addComponent(ship, {
            type: "Input",
            rotateLeft: false,
            rotateRight: false,
            thrust: false,
            shoot: false,
            hyperspace: false,
            rotationAmount: 0
        } as any);

        // Spawn first wave
        spawnAsteroidWave(this.world, 1);
    } finally {
        this.world.gameplayRandom.lock();
    }
  }

  public update(dt: number): void {
      this.world.update(dt);
  }

  private updateScreenConfig(): void {
    let width = this.config?.SCREEN_WIDTH ?? 800;
    let height = this.config?.SCREEN_HEIGHT ?? 600;

    if (typeof window !== "undefined") {
        width = window.innerWidth;
        height = window.innerHeight;
    }

    const screenConfig = { width, height };
    this.world.setResource("ScreenConfig", screenConfig);

    if (__DEV__) {
        console.log(`[AsteroidsGame] ScreenConfig updated: ${width}x${height}`);
    }
  }

  /**
   * Preloads game assets (SFX and Textures) to prevent cold-start latency.
   *
   * @warning
   * Asset loading may fail due to network or filesystem issues. Failure to
   * preload assets may result in visual or audio artifacts during gameplay.
   */
  private async onPreloadAssets(): Promise<void> {
    const loader = this.assetLoader;
    try {
      if (loader) {
        await loader.load([
          { id: "ship_sprite", type: "image", path: "../../../assets/ship.png" }
        ]);
      }
    } catch (e) {
      console.warn("[Asteroids] Asset preloading failed. Visuals or Audio may lag.", e);
    }
  }

  public setMultiplayerMode(active: boolean) {
    this.network.setMultiplayerMode(active);
  }

  /**
   * Applies an input frame to a specific player ship entity.
   */
  public applyInputToEntity(entityId: number, input: InputFrame) {
    this.network.applyInputToEntity(entityId, input);
  }


  /**
   * Performs local player movement prediction using the shared simulation.
   */
  public predictLocalPlayer(input: InputFrame, deltaTime: number) {
    this.network.predictLocalPlayer(input, deltaTime);
  }

  /**
   * Runs a single simulation step.
   */
  public runSimulationStep(deltaTime: number, isResimulating: boolean) {
    this.network.runSimulationStep(deltaTime, isResimulating);
  }

  public updateFromServer(payload: import("../../network/NetTypes").ServerUpdatePayload, localSessionId?: string) {
    this.network.updateFromServer(payload, localSessionId);
  }

  /**
   * Registers game-specific rendering logic to the provided renderer.
   */
  public initializeRenderer(renderer: Renderer<AsteroidsComponentRegistry>): void {
    if (this.isHeadless) return;
    initializeAsteroidsRenderer(renderer);
  }

  public getGameState(): GameStateComponent {
    const state = this.world.getSingleton("GameState");
    return state ? { ...state } : INITIAL_GAME_STATE;
  }

  public isGameOver(): boolean {
    return this.gameStateSystem.isGameOver();
  }

  /**
   * Decoupled Input Bridge: Sets the state of the local player inputs in the ECS World.
   * Mapped fields: rotateLeft, rotateRight, thrust, shoot, hyperspace, rotationAmount.
   * Ensures that the LocalPlayer entity has the "Input" component, adding it if missing.
   */
  public setInputState(input: Partial<InputState>): void {
    // Paso 1: Unificar el puente de Inputs
    const localPlayer = this.world.query("LocalPlayer")[0];
    if (localPlayer !== undefined) {
      if (!this.world.hasComponent(localPlayer, "Input")) {
        // Verify that the LocalPlayer entity has the "Input" component, adding it if missing with all flags false and rotationAmount 0.
        this.world.addComponent(localPlayer, {
          type: "Input",
          rotateLeft: false,
          rotateRight: false,
          thrust: false,
          shoot: false,
          hyperspace: false,
          rotationAmount: 0
        });
      }
      this.world.mutateComponent(localPlayer, "Input", (inputComp: any) => {
        // Only write fields that are defined in the payload (!== undefined)
        if (input.rotateLeft !== undefined) {
          inputComp.rotateLeft = input.rotateLeft;
        }
        if (input.rotateRight !== undefined) {
          inputComp.rotateRight = input.rotateRight;
        }
        if (input.thrust !== undefined) {
          inputComp.thrust = input.thrust;
        }
        if (input.shoot !== undefined) {
          inputComp.shoot = input.shoot;
        }
        if (input.hyperspace !== undefined) {
          inputComp.hyperspace = input.hyperspace;
        }
        if (input.rotationAmount !== undefined) {
          inputComp.rotationAmount = input.rotationAmount;
        }
      });
    }
  }

  public override start(): void {
    super.start();
    if (__DEV__) console.log("[AsteroidsGame] Simulation started");
  }

  public override destroy(): void {
    super.destroy();
    if (typeof window !== "undefined" && this.resizeListener) {
        window.removeEventListener("resize", this.resizeListener);
    }
    this.bulletPool?.clear();
    this.particlePool?.clear();
  }

  public override pause(): void {
    super.pause();
    this.world.setResource("IsPaused", true);
    if (__DEV__) console.log("[AsteroidsGame] Simulation paused");
  }

  public override resume(): void {
    super.resume();
    this.world.setResource("IsPaused", false);
    if (__DEV__) console.log("[AsteroidsGame] Simulation resumed");
  }

}

/** @public */
export class NullAsteroidsGame implements IAsteroidsGame {
  private _world = new World<AsteroidsComponentRegistry, AsteroidsEventRegistry>();
  private _loop = new GameLoop();
  public getWorld() { return this._world; }
  public getGameLoop() { return this._loop; }
  public isPausedState() { return false; }
  public isGameOver() { return false; }
  public getGameState() { return INITIAL_GAME_STATE; }
  public getSeed() { return 0; }
  public subscribe(_listener: any) { return () => {}; }
  public initializeRenderer() {}
  public setInputState(_input: Partial<InputState>) {}
}
