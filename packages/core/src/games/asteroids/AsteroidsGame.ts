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
import { InputFrame } from "../../network/NetTypes";
import type { IAsteroidsGame } from "./types/GameInterfaces";
import { BulletPool, ParticlePool } from "./EntityPool";
import { Renderer } from "../../rendering/Renderer";
import { initializeAsteroidsRenderer } from "./rendering/AsteroidsRendererManager";
import { NetworkManager } from "../../network/NetworkManager";
import { NullTransport } from "../../network/NullTransport";
import { ReplicationSystem } from "../../network/ReplicationSystem";
import { INetworkGame } from "../../network/NetworkManager";
import { ConfigService } from "../../config/ConfigService";
import { AsteroidConfigSchema, AsteroidConfig } from "./types/AsteroidConfigSchema";
import { SystemPhase } from "../../ecs/System";
import { GameStateComponent, InputState } from "./types/AsteroidTypes";

const __DEV__ = process.env.NODE_ENV !== "production";

/**
 * Main game controller for Asteroids.
 * Manages the ECS world, systems, and lifecycle.
 */
export class AsteroidsGame
  extends BaseGame<GameStateComponent, InputState, AsteroidsComponentRegistry, AsteroidsEventRegistry>
  implements IAsteroidsGame, INetworkGame {

  private gameStateSystem!: AsteroidGameStateSystem;
  private assetLoader!: AssetLoader;
  private bulletPool!: BulletPool;
  private particlePool!: ParticlePool;
  private networkManager?: NetworkManager;
  private lastProcessedFullStateVersion = -1;
  public readonly gameId = "asteroids";
  private config: AsteroidConfig;
  private resizeListener?: () => void;
  private isHeadless: boolean;
  private isMultiplayer: boolean;

  constructor(config: BaseGameConfig = {}) {
    super(config);
    this.isHeadless = config.headless || false;
    this.isMultiplayer = config.isMultiplayer || false;
    const rawConfig = require("./config/asteroids.json");
    this.config = rawConfig;
  }

  public override async initialize(): Promise<void> {
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

    this.registerSystems();
    this.initializeEntities();
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
    this.isMultiplayer = active;
    if (!active) {
      this.networkManager?.setTransport(new NullTransport());
    }
  }

  /**
   * Applies an input frame to a specific player ship entity.
   */
  public applyInputToEntity(entityId: number, input: InputFrame) {
    this.world.mutateComponent(entityId, "Input", (inputComp) => {
      inputComp.rotateLeft = input.actions.includes("rotateLeft");
      inputComp.rotateRight = input.actions.includes("rotateRight");
      inputComp.thrust = input.actions.includes("thrust");
      inputComp.shoot = input.actions.includes("shoot");
      inputComp.hyperspace = input.actions.includes("hyperspace");
      inputComp.rotationAmount = input.axes?.horizontal ?? 0;
    });
  }


  /**
   * Performs local player movement prediction using the shared simulation.
   */
  public predictLocalPlayer(input: InputFrame, deltaTime: number) {
    const localPlayer = this.world.query("LocalPlayer")[0];
    if (localPlayer !== undefined) {
      this.applyInputToEntity(localPlayer, input);
    }

    // Actual simulation step
    this.runSimulationStep(deltaTime, false);

    if (this.isMultiplayer && this.networkManager) {
      const strategy = this.networkManager.getStrategy();
      if (strategy.recordPrediction) {
        strategy.recordPrediction(input, this.world);
      }
    }
  }

  /**
   * Runs a single simulation step.
   */
  public runSimulationStep(deltaTime: number, _isResimulating: boolean) {
    this.world.update(deltaTime);
  }

  public updateFromServer(serverState: Record<string, unknown>, localSessionId?: string) {
    if (!this.isMultiplayer || !serverState || !this.networkManager) return;

    if (serverState.delta) {
        this.handleDeltaServerUpdate(serverState, localSessionId);
    } else if (serverState.fullWorldState) {
        this.handleFullServerUpdate(serverState, localSessionId);
    }
  }

  private handleDeltaServerUpdate(serverState: Record<string, unknown>, localSessionId?: string) {
    const serverTick = serverState.tick as number;
    const delta = serverState.delta as any;

    if (!this.networkManager) return;

    this.networkManager.processServerUpdate(serverTick, delta, localSessionId);

    const eventBus = this.world.getEventBus();
    if (eventBus && (delta as any).stateVersion !== undefined) {
      eventBus.emit("net:ack_version" as any, { version: (delta as any).stateVersion, tick: serverTick } as any);
    }
  }

  private handleFullServerUpdate(serverState: Record<string, unknown>, localSessionId?: string) {
    if (!this.networkManager) return;
    const authoritativeSnapshot = serverState.fullWorldState as any;

    if (authoritativeSnapshot.stateVersion === this.lastProcessedFullStateVersion) return;
    this.lastProcessedFullStateVersion = authoritativeSnapshot.stateVersion;

    const serverTick = serverState.serverTick as number;
    this.networkManager.processServerUpdate(serverTick, authoritativeSnapshot, localSessionId);
  }

  protected registerSystems(): void {
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
    this.world.addSystem(new SpatialCullingSystem(100), { phase: SystemPhase.Simulation, priority: 100 });

    this.world.addSystem(new JoystickSystem(), { phase: SystemPhase.Input });
    this.world.addSystem(new SpatialCullingSystem({ margin: 100 }), { phase: SystemPhase.Simulation, priority: 100 });
    this.world.addSystem(new AsteroidInputSystem(this.bulletPool, this.particlePool, this.config), { phase: SystemPhase.Simulation });
    this.world.addSystem(new MovementSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new BoundarySystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new FrictionSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new CCDSystem(), { phase: SystemPhase.Simulation, priority: -10 });
    this.world.addSystem(new CollisionSystem2D(), { phase: SystemPhase.Collision });
    this.world.addSystem(new AsteroidCollisionSystem(this.particlePool), { phase: SystemPhase.GameRules });
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
      this.world.addSystem(new ReplicationSystem(this.networkManager), { phase: SystemPhase.Presentation });
    }
  }

  protected initializeEntities(): void {
    if (this.isMultiplayer) return;
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
   */
  public setInputState(input: Partial<InputState>): void {
    const localPlayer = this.world.query("LocalPlayer")[0];
    if (localPlayer !== undefined) {
      this.world.mutateComponent(localPlayer, "InputState", (inputComp: any) => {
        if (input.thrust !== undefined) inputComp.buttons["thrust"] = input.thrust;
        if (input.shoot !== undefined) inputComp.buttons["shoot"] = input.shoot;
        if (input.rotateLeft !== undefined) inputComp.buttons["left"] = input.rotateLeft;
        if (input.rotateRight !== undefined) inputComp.buttons["right"] = input.rotateRight;
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
