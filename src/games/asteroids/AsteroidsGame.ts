import { World } from "../../engine/core/World";
import { GameLoop } from "../../engine/core/GameLoop";
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
import { AsteroidCollisionSystem } from "./systems/AsteroidCollisionSystem";
import { ShipControlSystem } from "./systems/ShipControlSystem";
import { TTLSystem } from "../../engine/systems/TTLSystem";
import { CollisionSystem2D } from "../../engine/physics/collision/CollisionSystem2D";
import { DeterministicSimulation } from "../../simulation/DeterministicSimulation";
import { type GameStateComponent, type InputState, INITIAL_GAME_STATE } from "./types/AsteroidTypes";
import { MutatorService } from "../../services/MutatorService";
import { InputFrame } from "../../multiplayer/NetTypes";
import { InterpolationBuffer } from "../../multiplayer/InterpolationSystem";
import { PredictionBuffer } from "../../multiplayer/PredictionBuffer";
import type { IAsteroidsGame } from "./types/GameInterfaces";
import { BulletPool, ParticlePool } from "./EntityPool";
import { Renderer } from "../../engine/rendering/Renderer";
import { initializeAsteroidsRenderer } from "./rendering/AsteroidsRendererManager";
import { NetworkSystem } from "../../engine/network/systems/NetworkSystem";
import { INetworkGame } from "../../engine/network/types/NetworkTypes";
import { ConfigService } from "../../engine/services/ConfigService";
import { AsteroidConfigSchema, AsteroidConfig } from "./types/AsteroidConfigSchema";

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
  private networkSystem: NetworkSystem;
  private serverEntities = new Map<string, number>();
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
  public applyInputToEntity(entityId: number, input: any) {
    this.world.mutateComponent<import("./types/AsteroidTypes").InputComponent>(entityId, "Input", inputComp => {
      inputComp.rotateLeft = input.actions.includes("rotateLeft") || (input.axes?.rotate_left ?? 0) > 0;
      inputComp.rotateRight = input.actions.includes("rotateRight") || (input.axes?.rotate_right ?? 0) > 0;
      inputComp.thrust = input.actions.includes("thrust") || (input.axes?.thrust ?? 0) > 0;
      inputComp.shoot = input.actions.includes("shoot");
      inputComp.hyperspace = input.actions.includes("hyperspace");
    });
  }

  /**
   * Sets a state snapshot for a specific tick in history.
   * Ensures history size limits are respected.
   */
  private setStateHistory(tick: number, snapshot: import("../../engine/types/EngineTypes").WorldSnapshot) {
    this.stateHistory.set(tick, snapshot);

    if (this.stateHistory.size > this.MAX_HISTORY) {
      // Find oldest tick to delete
      let oldestTick = Infinity;
      for (const t of this.stateHistory.keys()) {
        if (t < oldestTick) oldestTick = t;
      }
      if (oldestTick !== Infinity) {
        this.stateHistory.delete(oldestTick);
      }
    }
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
      this.networkSystem.recordPrediction(input, this.world);
    }
  }

  /**
   * Runs a single deterministic simulation step.
   * Internal API used by prediction, reconciliation and replay.
   */
  public runSimulationStep(deltaTime: number, isResimulating: boolean) {
    DeterministicSimulation.update(this.world, deltaTime, { isResimulating }, this.config);
    // Flush structural changes immediately after simulation to ensure world integrity
    // for subsequent ticks during reconciliation or prediction.
    this.world.flush();
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
    const delta = serverState.delta as any;

    let authoritativeSnapshot: import("../../engine/types/EngineTypes").WorldSnapshot;

    if (delta.created || delta.updated || delta.removed) {
      // DeltaPacket format: Apply to the best available baseline snapshot
      // Note: In a real implementation we should get the baseline from networkSystem
      // For now we assume the delta might be a filtered snapshot in 'interest' mode
      authoritativeSnapshot = delta;
    } else {
      authoritativeSnapshot = delta;
    }

    this.networkSystem.processServerUpdate(serverTick, authoritativeSnapshot, localSessionId);

    const eventBus = this.world.getResource<import("../../engine/core/EventBus").EventBus>("EventBus");
    if (eventBus && delta.stateVersion !== undefined) {
      eventBus.emitDeferred("net:ack_version", { version: delta.stateVersion, tick: serverTick });
    }
  }

  private handleFullServerUpdate(serverState: Record<string, unknown>, localSessionId?: string) {
    let authoritativeSnapshot: import("../../engine/types/EngineTypes").WorldSnapshot;

    if (typeof serverState.fullWorldState === "string") {
      authoritativeSnapshot = JSON.parse(serverState.fullWorldState);
    } else {
      authoritativeSnapshot = structuredClone(serverState.fullWorldState);
    }

    if (authoritativeSnapshot.stateVersion === this.lastProcessedFullStateVersion) return;
    this.lastProcessedFullStateVersion = authoritativeSnapshot.stateVersion;

    const serverTick = serverState.serverTick as number;
    this.networkSystem.processServerUpdate(serverTick, authoritativeSnapshot, localSessionId);
  }

  private applyDeltaToSnapshot(snapshot: import("../../engine/types/EngineTypes").WorldSnapshot, delta: import("../../engine/network/types/ReplicationTypes").DeltaPacket & import("../../engine/types/EngineTypes").WorldSnapshot) {
    const entitySet = new Set(snapshot.entities);

    if (delta.created || delta.updated || delta.removed) {
      // DeltaPacket format (Iteration 3+)
      if (delta.created) {
        delta.created.forEach((payload) => {
          const entityId = parseInt(payload.entityId);
          if (!entitySet.has(entityId)) {
            entitySet.add(entityId);
            snapshot.entities.push(entityId);
          }
          for (const type in payload.components) {
            if (!snapshot.componentData[type]) snapshot.componentData[type] = {};
            const sourceComp = payload.components[type];
            // CRITICAL: Clone component from delta to prevent aliasing with the network packet
            snapshot.componentData[type][entityId] = structuredClone(sourceComp);
            if (__DEV__) {
              if (snapshot.componentData[type][entityId] === sourceComp) {
                console.warn(`[AsteroidsGame] applyDeltaToSnapshot (created): Aliasing detected for type ${type}`);
              }
            }
          }
        });
      }
      if (delta.updated) {
        delta.updated.forEach((payload) => {
          const entityId = parseInt(payload.entityId);
          for (const type in payload.components) {
            if (!snapshot.componentData[type]) snapshot.componentData[type] = {};
            const sourceComp = payload.components[type];
            // CRITICAL: Clone component from delta to prevent aliasing
            snapshot.componentData[type][entityId] = structuredClone(sourceComp);
            if (__DEV__) {
              if (snapshot.componentData[type][entityId] === sourceComp) {
                console.warn(`[AsteroidsGame] applyDeltaToSnapshot (updated): Aliasing detected for type ${type}`);
              }
            }
          }
        });
      }
      if (delta.removed) {
        delta.removed.forEach((entityIdStr: string) => {
          const entityId = parseInt(entityIdStr);
          entitySet.delete(entityId);
          for (const type in snapshot.componentData) {
            delete snapshot.componentData[type][entityId];
          }
        });
        // Optimize: Filter entities in a single pass instead of per-entity splice
        snapshot.entities = snapshot.entities.filter(id => entitySet.has(id));
      }
      snapshot.entities.sort((a, b) => a - b);
    } else if (delta.componentData) {
      // Handle partial WorldSnapshot format (used in 'interest' mode or older delta)
      const componentData = delta.componentData;
      let entitiesAdded = false;
      for (const type in componentData) {
        if (!snapshot.componentData[type]) snapshot.componentData[type] = {};
        for (const entityIdStr in componentData[type]) {
          const entityId = parseInt(entityIdStr);
          const component = componentData[type][entityId];

          if (!entitySet.has(entityId)) {
            entitySet.add(entityId);
            snapshot.entities.push(entityId);
            entitiesAdded = true;
          }

          // CRITICAL: Clone component from delta to prevent aliasing
          snapshot.componentData[type][entityId] = structuredClone(component);
          if (__DEV__) {
            if (snapshot.componentData[type][entityId] === component) {
              console.warn(`[AsteroidsGame] applyDeltaToSnapshot (partial): Aliasing detected for type ${type}`);
            }
          }
        }
      }
      if (entitiesAdded) snapshot.entities.sort((a, b) => a - b);
    }

    if (delta.stateVersion !== undefined) {
      snapshot.stateVersion = delta.stateVersion;
    }
  }

  private performReconciliation(serverTick: number, authoritativeSnapshot: import("../../engine/types/EngineTypes").WorldSnapshot, localSessionId?: string) {
    const predicted = this.predictionBuffer.getAt(serverTick);

    // Record the authoritative state for this tick to prevent redundant rollbacks
    this.setStateHistory(serverTick, authoritativeSnapshot);

    let needsRollback = false;
    let localPlayerId: number | undefined;

    if (!predicted) {
      needsRollback = true;
    } else {
      if (predicted.entities.length !== authoritativeSnapshot.entities.length) {
        needsRollback = true;
      } else if (localSessionId) {
        const shipMap = predicted.componentData["Ship"];
        if (shipMap) {
          for (const id in shipMap) {
            if (shipMap[id].sessionId === localSessionId) {
              localPlayerId = parseInt(id);
              break;
            }
          }
        }

        if (localPlayerId !== undefined) {
          const aPos = authoritativeSnapshot.componentData["Transform"]?.[localPlayerId];
          if (!predicted || !aPos ||
              Math.abs(predicted.state.x - aPos.x) > 0.1 ||
              Math.abs(predicted.state.y - aPos.y) > 0.1 ||
              Math.abs((predicted.state.angle ?? 0) - (aPos.rotation ?? 0)) > 0.01) {
            needsRollback = true;
          }
        }
      }
    }

    if (needsRollback) {
      // Before restoring, capture current predicted visuals for smoothing
      const visualMismatches = new Map<number, { dx: number, dy: number }>();
      if (localPlayerId !== undefined) {
        const currentTrans = this.world.getComponent<import("../../engine/types/EngineTypes").TransformComponent>(localPlayerId, "Transform");
        if (currentTrans) {
          visualMismatches.set(localPlayerId, { dx: currentTrans.x, dy: currentTrans.y });
        }
      }

      this.world.restore(authoritativeSnapshot);

      // Save authoritative state for the local player to prediction buffer to prevent redundant rollbacks
      if (localPlayerId !== undefined && localSessionId) {
          const aPos = authoritativeSnapshot.componentData["Transform"]?.[localPlayerId];
          const aVel = authoritativeSnapshot.componentData["Velocity"]?.[localPlayerId];
          if (aPos && aVel) {
              this.predictionBuffer.save({
                  tick: serverTick,
                  entityId: localPlayerId.toString(),
                  state: { x: aPos.x, y: aPos.y, vx: aVel.dx, vy: aVel.dy, angle: aPos.rotation }
              });
          }
      }

      // Re-apply LocalPlayer tag
      let localPlayerEntity: number | undefined;
      if (localSessionId) {
        const ships = this.world.query("Ship");
        localPlayerEntity = ships.find(e => {
          const ship = this.world.getComponent<import("./types/AsteroidTypes").ShipComponent>(e, "Ship");
          return ship && ship.sessionId === localSessionId;
        });
        if (localPlayerEntity !== undefined) {
          this.world.getCommandBuffer().addComponent(localPlayerEntity, { type: "LocalPlayer" } as import("../../engine/core/Component").Component);
        }
      }

      // Re-simulate
      this.inputHistory
        .filter(input => input.tick > serverTick)
        .forEach(input => {
          if (localPlayerEntity !== undefined) {
            this.applyInputToEntity(localPlayerEntity, input);
          }
          this.runSimulationStep(16.66, true);

          // Re-save prediction after re-simulation
          const lp_resim = this.world.query("LocalPlayer")[0];
          if (lp_resim !== undefined) {
            const trans = this.world.getComponent<import("../../engine/types/EngineTypes").TransformComponent>(lp_resim, "Transform");
            const vel = this.world.getComponent<import("../../engine/types/EngineTypes").VelocityComponent>(lp_resim, "Velocity");
            if (trans && vel) {
              this.predictionBuffer.save({
                tick: input.tick,
                entityId: lp_resim.toString(),
                state: { x: trans.x, y: trans.y, vx: vel.dx, vy: vel.dy, angle: trans.rotation }
              });
            }
          }

          this.setStateHistory(input.tick, this.world.snapshot());
        });

      // Apply Visual Smoothing (Smooth Error Correction)
      visualMismatches.forEach((prevPos, id) => {
        const newTrans = this.world.getComponent<import("../../engine/types/EngineTypes").TransformComponent>(id, "Transform");
        if (newTrans) {
          const errX = prevPos.dx - newTrans.x;
          const errY = prevPos.dy - newTrans.y;

          // Apply the error to VisualOffset and LERP it back in JuiceSystem
          const visualOffset = {
            type: "VisualOffset",
            x: errX,
            y: errY,
            rotation: 0,
            scaleX: 0,
            scaleY: 0
          } as import("../../engine/core/CoreComponents").VisualOffsetComponent;

          this.world.getCommandBuffer().addComponent(id, visualOffset);

          JuiceSystem.add(this.world, id, {
            property: "x",
            target: 0,
            duration: 150,
            easing: "easeOut"
          });
          JuiceSystem.add(this.world, id, {
            property: "y",
            target: 0,
            duration: 150,
            easing: "easeOut"
          });
        }
      });
    }

    this.inputHistory = this.inputHistory.filter(i => i.tick > serverTick);
    this.predictionBuffer.clearBefore(serverTick);
  }

  protected registerSystems(): void {
    // Initialize pools here because super() calls this before the constructor finishes
    if (!this.bulletPool) this.bulletPool = new BulletPool();
    if (!this.particlePool) this.particlePool = new ParticlePool();
    if (!this.assetLoader) this.assetLoader = new AssetLoader();

    if (this.isMultiplayer && !this.networkSystem) {
        this.networkSystem = new NetworkSystem(this);
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

    if (!this.isHeadless) {
      this.world.addSystem(new ScreenShakeSystem());
      this.world.addSystem(new JuiceSystem());
    }

    this.world.addSystem(new SpatialPartitioningSystem());
    this.world.addSystem(new LootSystem());
    this.world.addSystem(new PowerUpSystem());
    this.world.addSystem(new ModifierSystem());

    const activeMutators = MutatorService.getActiveMutatorsForGame(this.gameId);
    this.world.addSystem(new MutatorSystem(activeMutators));

    if (!this.isHeadless) {
      this.world.addSystem(new RenderUpdateSystem()); // Handle rotation/hit flash
      this.world.addSystem(new AsteroidRenderSystem(this.config.TRAIL_MAX_LENGTH)); // Handle trails
    }

    if (this.isMultiplayer) {
      this.world.addSystem(this.networkSystem);
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
      this.networkSystem.reset();
    }
    this.serverEntities.clear();
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
