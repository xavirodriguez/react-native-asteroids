import { World } from "../../engine/core/World";
import { GameLoop } from "../../engine/core/GameLoop";
import { BaseGame } from "../../engine/core/BaseGame";
import { AssetLoader } from "../../engine/assets/AssetLoader";
import { AsteroidGameStateSystem } from "./systems/AsteroidGameStateSystem";
import { AsteroidRenderSystem } from "./systems/AsteroidRenderSystem";
import { AsteroidComboSystem } from "./systems/AsteroidComboSystem";
import { AsteroidInputSystem } from "./systems/AsteroidInputSystem";
import { UfoSystem } from "./systems/UfoSystem";
import { StatusEffectSystem } from "../../engine/systems/StatusEffectSystem";
import { LootSystem } from "../../engine/systems/LootSystem";
import { PowerUpSystem } from "../../engine/systems/PowerUpSystem";
import { JuiceSystem } from "../../engine/systems/JuiceSystem";
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
  private lastProcessedFullStateVersion = -1;
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

    await this.onPreloadAssets();
    await super.init();
  }

  /**
   * Preloads game assets (SFX) into the AudioSystem to prevent cold-start latency.
   */
  private async onPreloadAssets(): Promise<void> {
    const audio = this.audio;
    try {
      await Promise.all([
        audio.loadSFX("explosion", "/assets/audio/explosion.mp3"),
        audio.loadSFX("hit", "/assets/audio/hit.mp3"),
        audio.loadSFX("shoot", "/assets/audio/shoot.mp3"),
        audio.loadSFX("game_over", "/assets/audio/game_over.mp3"),
      ]);
    } catch (e) {
      console.warn("[Asteroids] Asset preloading failed. Audio may lag on first play.", e);
    }
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
    if (serverTick <= this.lastAuthoritativeTick) return;

    const delta = typeof serverState.delta === "string" ? JSON.parse(serverState.delta) : serverState.delta;

    let authoritativeSnapshot: import("../../engine/types/EngineTypes").WorldSnapshot;

    if (delta.created || delta.updated || delta.removed) {
      // DeltaPacket format: Apply to the best available baseline snapshot
      const baseSnapshot = this.stateHistory.get(this.lastAuthoritativeTick) ?? this.world.snapshot();
      authoritativeSnapshot = structuredClone(baseSnapshot);
      this.applyDeltaToSnapshot(authoritativeSnapshot, delta);
    } else {
      // Filtered WorldSnapshot format (Interest Management mode)
      authoritativeSnapshot = delta;
    }

    this.lastAuthoritativeTick = serverTick;
    this.performReconciliation(serverTick, authoritativeSnapshot, localSessionId);

    // Acknowledge the received state version to the server
    const eventBus = this.world.getResource<import("../../engine/core/EventBus").EventBus>("EventBus");
    if (eventBus && delta.stateVersion !== undefined) {
      eventBus.emit("net:ack_version", { version: delta.stateVersion, tick: serverTick });
    }
  }

  private handleFullServerUpdate(serverState: Record<string, unknown>, localSessionId?: string) {
    const authoritativeSnapshot = typeof serverState.fullWorldState === "string"
      ? JSON.parse(serverState.fullWorldState)
      : serverState.fullWorldState;

    // Skip if this full snapshot hasn't changed since last processing
    if (authoritativeSnapshot.stateVersion === this.lastProcessedFullStateVersion) return;

    const serverTick = serverState.serverTick as number;
    // We only skip if we already processed a MORE RECENT authoritative state.
    // Full snapshots should take precedence if they correspond to the same tick as a previous delta.
    if (serverTick < this.lastAuthoritativeTick) return;

    this.lastAuthoritativeTick = serverTick;
    this.lastProcessedFullStateVersion = authoritativeSnapshot.stateVersion;

    this.performReconciliation(serverTick, authoritativeSnapshot, localSessionId);
  }

  private applyDeltaToSnapshot(snapshot: import("../../engine/types/EngineTypes").WorldSnapshot, delta: any) {
    const entitySet = new Set(snapshot.entities);

    if (delta.created || delta.updated || delta.removed) {
      // DeltaPacket format (Iteration 3+)
      if (delta.created) {
        delta.created.forEach((payload: any) => {
          const entityId = payload.entityId;
          if (!entitySet.has(entityId)) {
            entitySet.add(entityId);
            snapshot.entities.push(entityId);
          }
          for (const type in payload.components) {
            if (!snapshot.componentData[type]) snapshot.componentData[type] = {};
            snapshot.componentData[type][entityId] = payload.components[type];
          }
        });
      }
      if (delta.updated) {
        delta.updated.forEach((payload: any) => {
          const entityId = payload.entityId;
          for (const type in payload.components) {
            if (!snapshot.componentData[type]) snapshot.componentData[type] = {};
            snapshot.componentData[type][entityId] = payload.components[type];
          }
        });
      }
      if (delta.removed) {
        delta.removed.forEach((entityId: number) => {
          const index = snapshot.entities.indexOf(entityId);
          if (index !== -1) snapshot.entities.splice(index, 1);
          entitySet.delete(entityId);
          for (const type in snapshot.componentData) {
            delete snapshot.componentData[type][entityId];
          }
        });
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

          snapshot.componentData[type][entityId] = component;
        }
      }
      if (entitiesAdded) snapshot.entities.sort((a, b) => a - b);
    }

    if (delta.stateVersion !== undefined) {
      snapshot.stateVersion = delta.stateVersion;
    }
  }

  private performReconciliation(serverTick: number, authoritativeSnapshot: import("../../engine/types/EngineTypes").WorldSnapshot, localSessionId?: string) {
    const predicted = this.stateHistory.get(serverTick);

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
          const pPos = predicted.componentData["Transform"]?.[localPlayerId];
          const aPos = authoritativeSnapshot.componentData["Transform"]?.[localPlayerId];
          if (!pPos || !aPos || Math.abs(pPos.x - aPos.x) > 0.01 || Math.abs(pPos.y - aPos.y) > 0.01) {
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

      // Re-apply LocalPlayer tag
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

      // Re-simulate
      this.inputHistory
        .filter(input => input.tick > serverTick)
        .forEach(input => {
          const lp = this.world.query("LocalPlayer")[0];
          if (lp !== undefined) {
            const inputComp = this.world.getComponent<import("./types/AsteroidTypes").InputComponent>(lp, "Input");
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

      // Apply Visual Smoothing (Smooth Error Correction)
      visualMismatches.forEach((prevPos, id) => {
        const newTrans = this.world.getComponent<import("../../engine/types/EngineTypes").TransformComponent>(id, "Transform");
        if (newTrans) {
          const errX = prevPos.dx - newTrans.x;
          const errY = prevPos.dy - newTrans.y;

          // Apply the error to VisualOffset and LERP it back in JuiceSystem
          this.world.addComponent(id, {
            type: "VisualOffset",
            x: errX,
            y: errY,
            rotation: 0,
            scaleX: 0,
            scaleY: 0
          } as import("../../engine/core/CoreComponents").VisualOffsetComponent);

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
    this.world.addSystem(new StatusEffectSystem());
    this.world.addSystem(new ScreenShakeSystem());
    this.world.addSystem(new JuiceSystem());
    this.world.addSystem(new SpatialPartitioningSystem());
    this.world.addSystem(new LootSystem());
    this.world.addSystem(new PowerUpSystem());
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
