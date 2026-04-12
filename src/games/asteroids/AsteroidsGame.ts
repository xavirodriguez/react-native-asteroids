import { World } from "../../engine/core/World";
import { BaseGame } from "../../engine/core/BaseGame";
import { AssetLoader } from "../../engine/assets/AssetLoader";
import { AsteroidGameStateSystem } from "./systems/AsteroidGameStateSystem";
import { AsteroidRenderSystem } from "./systems/AsteroidRenderSystem";
import { AsteroidComboSystem } from "./systems/AsteroidComboSystem";
import { AsteroidInputSystem } from "./systems/AsteroidInputSystem";
import { UfoSystem } from "./systems/UfoSystem";
import { RenderUpdateSystem } from "../../engine/systems/RenderUpdateSystem";
import { MovementSystem } from "../../engine/systems/MovementSystem";
import { BoundarySystem } from "../../engine/systems/BoundarySystem";
import { FrictionSystem } from "../../engine/systems/FrictionSystem";
import { ScreenShakeSystem } from "../../engine/systems/ScreenShakeSystem";
import { AsteroidCollisionSystem } from "./systems/AsteroidCollisionSystem";
import { ShipControlSystem } from "./systems/ShipControlSystem";
import { TTLSystem } from "../../engine/systems/TTLSystem";
import { TransformComponent, VelocityComponent, RenderComponent, FrictionComponent, TagComponent, HealthComponent } from "../../engine/types/EngineTypes";
import { PhysicsUtils } from "../../engine/utils/PhysicsUtils";
import { ShipPhysics } from "./utils/ShipPhysics";
import { DeterministicSimulation } from "../../simulation/DeterministicSimulation";
import { GAME_CONFIG, type GameStateComponent, type InputState, INITIAL_GAME_STATE } from "./types/AsteroidTypes";
import { MutatorService } from "../../services/MutatorService";
import { InputFrame } from "../../multiplayer/NetTypes";
import { InterpolationBuffer } from "../../multiplayer/InterpolationSystem";
import type { IAsteroidsGame } from "./types/GameInterfaces";
import { BulletPool, ParticlePool } from "./EntityPool";
import { Renderer } from "../../engine/rendering/Renderer";
import { initializeAsteroidsRenderer } from "./rendering/AsteroidsRendererManager";

/**
 * Main game controller for Asteroids.
 * Manages the ECS world, systems, and lifecycle.
 */
export class AsteroidsGame
  extends BaseGame<GameStateComponent, InputState>
  implements IAsteroidsGame {

  private gameStateSystem: AsteroidGameStateSystem;
  private assetLoader: AssetLoader;
  private bulletPool: BulletPool;
  private particlePool: ParticlePool;
  private entityInterpolationBuffers = new Map<string, InterpolationBuffer>();
  private serverEntities = new Map<string, number>();
  private inputHistory: InputFrame[] = [];
  private stateHistory = new Map<number, any>();
  private lastAuthoritativeTick = 0;
  public readonly gameId = "asteroids";
  private config: typeof GAME_CONFIG;

  constructor(config: { isMultiplayer?: boolean, seed?: number } = {}) {
    super({
      pauseKey: GAME_CONFIG.KEYS.PAUSE,
      restartKey: GAME_CONFIG.KEYS.RESTART,
      isMultiplayer: config.isMultiplayer,
      gameOptions: { seed: config.seed }
    });
  }

  public override async init(): Promise<void> {
    const mutators = MutatorService.getActiveMutatorsForGame(this.gameId);
    const enabled = await MutatorService.isMutatorModeEnabled();
    this.config = enabled
      ? mutators.reduce((cfg, m) => m.apply(cfg), { ...GAME_CONFIG })
      : { ...GAME_CONFIG };

    await super.init();
  }

  public setMultiplayerMode(active: boolean) {
    this.isMultiplayer = active;
  }

  /**
   * Predicts local player movement using the shared deterministic simulation.
   */
  public predictLocalPlayer(input: InputFrame, deltaTime: number) {
    this.inputHistory.push(input);
    const localPlayer = this.world.query("LocalPlayer")[0];
    if (localPlayer !== undefined) {
        const inputComp = this.world.getComponent<any>(localPlayer, "Input");
        if (inputComp) {
            inputComp.rotateLeft = input.actions.includes("rotateLeft") || (input.axes?.rotate_left ?? 0) > 0;
            inputComp.rotateRight = input.actions.includes("rotateRight") || (input.axes?.rotate_right ?? 0) > 0;
            inputComp.thrust = input.actions.includes("thrust") || (input.axes?.thrust ?? 0) > 0;
            inputComp.shoot = input.actions.includes("shoot");
        }
    }

    DeterministicSimulation.update(this.world, deltaTime, { isResimulating: false });
    this.stateHistory.set(input.tick, this.world.snapshot());

    // Keep history manageable
    if (this.inputHistory.length > 120) this.inputHistory.shift();
    const oldestTick = input.tick - 120;
    if (this.stateHistory.has(oldestTick)) this.stateHistory.delete(oldestTick);
  }

  public updateFromServer(serverState: any, localSessionId?: string) {
    if (!this.isMultiplayer || !serverState) return;
    const serverTick = serverState.serverTick;
    if (serverTick <= this.lastAuthoritativeTick) return;
    this.lastAuthoritativeTick = serverTick;

    // 1. Comparison & Rollback
    const predicted = this.stateHistory.get(serverTick);
    if (predicted && localSessionId) {
        const localPlayerState = serverState.players?.[localSessionId];
        if (localPlayerState) {
            const localPlayerEntity = this.world.query("LocalPlayer")[0];
            if (localPlayerEntity !== undefined) {
                const predictedPos = predicted.componentData["Transform"]?.[localPlayerEntity];

                const THRESHOLD = 0.1;
                const dx = Math.abs(predictedPos.x - localPlayerState.x);
                const dy = Math.abs(predictedPos.y - localPlayerState.y);

                if (dx > THRESHOLD || dy > THRESHOLD) {
                    console.log(`Rollback detected at tick ${serverTick}. Mismatch: ${dx.toFixed(2)}, ${dy.toFixed(2)}`);

                    // Build a temporary snapshot from server state
                    // (Simplified: we use the predicted one but update the local player)
                    // In a full implementation, we'd rebuild the entire state from server schema
                    predicted.componentData["Transform"][localPlayerEntity].x = localPlayerState.x;
                    predicted.componentData["Transform"][localPlayerEntity].y = localPlayerState.y;
                    if (predicted.componentData["Velocity"]?.[localPlayerEntity]) {
                        predicted.componentData["Velocity"][localPlayerEntity].dx = localPlayerState.velocityX;
                        predicted.componentData["Velocity"][localPlayerEntity].dy = localPlayerState.velocityY;
                    }

                    this.world.restore(predicted);

                    // Re-simulate forward
                    const lastInputTick = this.inputHistory[this.inputHistory.length - 1]?.tick || serverTick;
                    this.inputHistory.filter(i => i.tick > serverTick).forEach(input => {
                        // Apply input to LocalPlayer
                        const inputComp = this.world.getComponent<any>(localPlayerEntity, "Input");
                        if (inputComp) {
                            inputComp.rotateLeft = input.actions.includes("rotateLeft") || (input.axes?.rotate_left ?? 0) > 0;
                            inputComp.rotateRight = input.actions.includes("rotateRight") || (input.axes?.rotate_right ?? 0) > 0;
                            inputComp.thrust = input.actions.includes("thrust") || (input.axes?.thrust ?? 0) > 0;
                            inputComp.shoot = input.actions.includes("shoot");
                        }
                        DeterministicSimulation.update(this.world, 16.66, { isResimulating: true });
                        this.stateHistory.set(input.tick, this.world.snapshot());
                    });
                }
            }
        }
    }
    // Cleanup old input history
    this.inputHistory = this.inputHistory.filter(i => i.tick >= serverTick);
  }

  protected registerSystems(): void {
    // Initialize pools here because super() calls this before the constructor finishes
    if (!this.bulletPool) this.bulletPool = new BulletPool();
    if (!this.particlePool) this.particlePool = new ParticlePool();
    if (!this.assetLoader) this.assetLoader = new AssetLoader();

    // Configure UnifiedInputSystem bindings
    this.unifiedInput.bind("thrust", [GAME_CONFIG.KEYS.THRUST]);
    this.unifiedInput.bind("rotateLeft", [GAME_CONFIG.KEYS.ROTATE_LEFT]);
    this.unifiedInput.bind("rotateRight", [GAME_CONFIG.KEYS.ROTATE_RIGHT]);
    this.unifiedInput.bind("shoot", [GAME_CONFIG.KEYS.SHOOT]);
    this.unifiedInput.bind("hyperspace", [GAME_CONFIG.KEYS.HYPERSPACE]);

    const inputSys = new AsteroidInputSystem(this.bulletPool, this.particlePool, this.config);
    if (this.isMultiplayer) inputSys.setMultiplayerMode(true);
    this.gameStateSystem = new AsteroidGameStateSystem(this);
    const comboSys = new AsteroidComboSystem();

    this.world.addSystem(this.unifiedInput);
    this.world.addSystem(inputSys);
    this.world.addSystem(new ShipControlSystem(this.config));
    this.world.addSystem(new MovementSystem());
    this.world.addSystem(new BoundarySystem());
    this.world.addSystem(new FrictionSystem());
    this.world.addSystem(new AsteroidCollisionSystem(this.particlePool));
    this.world.addSystem(comboSys);
    this.world.addSystem(new TTLSystem());
    this.world.addSystem(this.gameStateSystem);
    this.world.addSystem(new UfoSystem());
    this.world.addSystem(new ScreenShakeSystem());
    this.world.addSystem(new RenderUpdateSystem()); // Handle rotation/hit flash
    this.world.addSystem(new AsteroidRenderSystem()); // Handle trails
  }

  protected initializeEntities(): void {}

  /**
   * Registers game-specific rendering logic to the provided renderer.
   */
  public initializeRenderer(renderer: Renderer): void {
    initializeAsteroidsRenderer(renderer);
  }

  protected _onBeforeRestart(): void {
    this.gameStateSystem.resetGameOverState(this.world);
  }

  public getGameState(): GameStateComponent {
    return this.getWorld().getSingleton<GameStateComponent>("GameState") ?? INITIAL_GAME_STATE;
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
  public setInput() {}
  public subscribe() { return () => {}; }
  public initializeRenderer() {}
}
