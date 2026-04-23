import { World } from "../../engine/core/World";
import { GameLoop } from "../../engine/core/GameLoop";
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
import { CollisionSystem2D } from "../../engine/physics/collision/CollisionSystem2D";
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
  private stateHistory = new Map<number, import("../../engine/types/EngineTypes").WorldSnapshot>();
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
   * Performs local player movement prediction using the shared simulation.
   *
   * @remarks
   * Aims to support visual consistency by preemptively executing simulation logic on the client.
   */
  public predictLocalPlayer(input: InputFrame, deltaTime: number) {
    this.inputHistory.push(input);

    const localPlayer = this.world.query("LocalPlayer")[0];
    if (localPlayer !== undefined) {
        const inputComp = this.world.getComponent<import("./types/AsteroidTypes").InputComponent>(localPlayer, "Input");
        if (inputComp) {
            inputComp.rotateLeft = input.actions.includes("rotateLeft") || (input.axes?.rotate_left ?? 0) > 0;
            inputComp.rotateRight = input.actions.includes("rotateRight") || (input.axes?.rotate_right ?? 0) > 0;
            inputComp.thrust = input.actions.includes("thrust") || (input.axes?.thrust ?? 0) > 0;
            inputComp.shoot = input.actions.includes("shoot");
            inputComp.hyperspace = input.actions.includes("hyperspace");
        }
    }

    DeterministicSimulation.update(this.world, deltaTime, { isResimulating: false });

    // Attempts to capture state after simulation for potential reconciliation
    this.stateHistory.set(input.tick, this.world.snapshot());

    // Keep history manageable
    if (this.inputHistory.length > 120) this.inputHistory.shift();
    const oldestTick = input.tick - 120;
    if (this.stateHistory.has(oldestTick)) this.stateHistory.delete(oldestTick);
  }

  public updateFromServer(serverState: Record<string, unknown>, localSessionId?: string) {
    if (!this.isMultiplayer || !serverState || !serverState.fullWorldState) return;
    const serverTick = serverState.serverTick as number;
    if (serverTick <= this.lastAuthoritativeTick) return;
    this.lastAuthoritativeTick = serverTick;

    const authoritativeSnapshot = JSON.parse(serverState.fullWorldState as string) as import("../../engine/types/EngineTypes").WorldSnapshot;
    const predicted = this.stateHistory.get(serverTick);

    let needsRollback = false;
    if (!predicted) {
      needsRollback = true;
    } else {
      // Deep compare predicted state vs authoritative state
      // We focus on critical gameplay state: entity counts and positions
      if (predicted.entities.length !== authoritativeSnapshot.entities.length) {
        needsRollback = true;
      } else {
        // Sample check of local player if exists
        if (localSessionId) {
           // Find local player ID by checking Ship components in predicted state
           const shipMap = predicted.componentData["Ship"];
           let localPlayerId: number | undefined;
           if (shipMap) {
               for (const id in shipMap) {
                   if (shipMap[id].sessionId === localSessionId) {
                       localPlayerId = parseInt(id);
                       break;
                   }
               }
           }

           if (localPlayerId !== undefined) {
               const pPos = predicted.componentData["Transform"]?.[localPlayerId];
               const aPos = authoritativeSnapshot.componentData["Transform"]?.[localPlayerId];
               const pVel = predicted.componentData["Velocity"]?.[localPlayerId];
               const aVel = authoritativeSnapshot.componentData["Velocity"]?.[localPlayerId];

               if (!pPos || !aPos || Math.abs(pPos.x - aPos.x) > 0.01 || Math.abs(pPos.y - aPos.y) > 0.01 ||
                   Math.abs(pPos.rotation - aPos.rotation) > 0.01 ||
                   !pVel || !aVel || Math.abs(pVel.dx - aVel.dx) > 0.01 || Math.abs(pVel.dy - aVel.dy) > 0.01) {
                   needsRollback = true;
               }
           }
        }
      }
    }

    if (needsRollback) {
      console.log(`[Rollback] Divergence at tick ${serverTick}. Re-simulating...`);
      this.world.restore(authoritativeSnapshot);

      // Re-apply LocalPlayer tag if it was on a ship
      if (localSessionId) {
          const ships = this.world.query("Ship");
          const localPlayerEntity = ships.find(e => {
              const ship = this.world.getComponent<import("./types/AsteroidTypes").ShipComponent>(e, "Ship");
              return ship && ship.sessionId === localSessionId;
          });
          if (localPlayerEntity !== undefined) {
              this.world.addComponent(localPlayerEntity, { type: "LocalPlayer" } as import("../../engine/core/Component").Component);
          }
      }

      // Re-simulate from serverTick + 1 to current prediction head
      this.inputHistory
        .filter(input => input.tick > serverTick)
        .forEach(input => {
          const localPlayer = this.world.query("LocalPlayer")[0];
          if (localPlayer !== undefined) {
            const inputComp = this.world.getComponent<import("./types/AsteroidTypes").InputComponent>(localPlayer, "Input");
            if (inputComp) {
              inputComp.rotateLeft = input.actions.includes("rotateLeft") || (input.axes?.rotate_left ?? 0) > 0;
              inputComp.rotateRight = input.actions.includes("rotateRight") || (input.axes?.rotate_right ?? 0) > 0;
              inputComp.thrust = input.actions.includes("thrust") || (input.axes?.thrust ?? 0) > 0;
              inputComp.shoot = input.actions.includes("shoot");
              inputComp.hyperspace = input.actions.includes("hyperspace");
            }
          }
          DeterministicSimulation.update(this.world, 16.66, { isResimulating: true });
          this.stateHistory.set(input.tick, this.world.snapshot());
        });
    }

    // Cleanup history
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
    this.world.addSystem(new CollisionSystem2D());
    this.world.addSystem(new AsteroidCollisionSystem(this.particlePool));
    this.world.addSystem(comboSys);
    this.world.addSystem(new TTLSystem());
    this.world.addSystem(this.gameStateSystem);
    this.world.addSystem(new UfoSystem());
    this.world.addSystem(new ScreenShakeSystem());
    this.world.addSystem(new RenderUpdateSystem()); // Handle rotation/hit flash
    this.world.addSystem(new AsteroidRenderSystem()); // Handle trails
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
  public getSeed() { return 0; }
  public setInput() {}
  public subscribe() { return () => {}; }
  public initializeRenderer() {}
}
