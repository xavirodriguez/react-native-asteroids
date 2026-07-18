import { BaseGame, WorldSnapshot, GameLoop, World } from "@tiny-aster/core";
import { FlappyBirdInput, FLAPPY_CONFIG, INITIAL_FLAPPY_STATE, FlappyBirdState, BirdComponent, PipeComponent, FlappyBirdComponentRegistry } from "./types/FlappyBirdTypes";
import { FlappyBirdGameStateSystem } from "./systems/FlappyBirdGameStateSystem";
import { FlappyBirdInputSystem } from "./systems/FlappyBirdInputSystem";
import { FlappyBirdCollisionSystem } from "./systems/FlappyBirdCollisionSystem";
import { FlappyBirdGlideSystem } from "./systems/FlappyBirdGlideSystem";
import { FlappyBirdRenderSystem } from "./systems/FlappyBirdRenderSystem";
import { IFlappyBirdGame } from "./types/GameInterfaces";
import { InputBufferSystem } from "./systems/FlappyBirdInputSystem";
import { MovementSystem } from "@tiny-aster/core";
import { CollisionSystem2D } from "@tiny-aster/core";
import { JuiceSystem } from "@tiny-aster/core";
import { Renderer } from "@tiny-aster/core";
import { TransformComponent, RenderComponent, EventBus, UnifiedInputSystem } from "@tiny-aster/core";
import {
  createBird,
  createGameState,
  createGround
} from "./EntityFactory";
import {
  drawFlappyBird,
  drawFlappyPipe,
  drawFlappyGround,
  scrollingBackgroundEffect
} from "./rendering/FlappyBirdCanvasVisuals";
import { MutatorService } from "../../services/MutatorService";
import { MutatorSystem } from "@tiny-aster/core";
import { NetworkManager } from "@tiny-aster/core";
import { ReplicationSystem } from "@tiny-aster/core";
import { SystemPhase } from "@tiny-aster/core";

/**
 * Controlador principal del juego Flappy Bird.
 *
 * @remarks
 * Implementa mecánicas de scroll infinito y generación procedural de obstáculos (tuberías).
 * Utiliza un sistema de gravedad simple y una única acción de entrada ("jump").
 */
export class FlappyBirdGame
  extends BaseGame<FlappyBirdState, FlappyBirdInput, FlappyBirdComponentRegistry>
  implements IFlappyBirdGame {

  private gameStateSystem!: FlappyBirdGameStateSystem;
  private networkManager!: NetworkManager;
  public readonly gameId = "flappybird";
  private config!: typeof FLAPPY_CONFIG;
  public isMultiplayer = false;

  constructor(config: { isMultiplayer?: boolean, seed?: number, gameOptions?: Record<string, unknown> } = {}) {
    const seed = config.gameOptions?.seed as number || config.seed;
    super({
      pauseKey: FLAPPY_CONFIG.KEYS.PAUSE,
      restartKey: FLAPPY_CONFIG.KEYS.RESTART,
      isMultiplayer: config.isMultiplayer,
      gameOptions: { ...config.gameOptions, seed }
    });
    this.isMultiplayer = !!config.isMultiplayer;
  }

  protected override async onRegisterSystems(): Promise<void> {
    const mutators = MutatorService.getActiveMutatorsForGame(this.gameId);
    const enabled = await MutatorService.isMutatorModeEnabled();
    this.config = enabled
      ? mutators.reduce((cfg, m) => m.apply(cfg), { ...(FLAPPY_CONFIG as any) })
      : { ...FLAPPY_CONFIG };
    this.world.setResource("ScreenConfig", { width: this.config.SCREEN_WIDTH, height: this.config.SCREEN_HEIGHT });
    this._config.gameOptions = { ...this._config.gameOptions, ...this.config };

    await this.onPreloadAssets();

    // Bind inputs for UnifiedInputSystem
    this.unifiedInput.bind("flap", [FLAPPY_CONFIG.KEYS.FLAP]);

    this.gameStateSystem = new FlappyBirdGameStateSystem(this, this.config);

    const inputSys = new FlappyBirdInputSystem(this.config);
    if (this.isMultiplayer) inputSys.setMultiplayerMode(true);

    this.world.addSystem(this.unifiedInput, { phase: SystemPhase.Input });
    this.world.addSystem(new InputBufferSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(inputSys, { phase: SystemPhase.Simulation });
    this.world.addSystem(new FlappyBirdGlideSystem(), { phase: SystemPhase.Simulation });
    this.world.addSystem(new MovementSystem() as any, { phase: SystemPhase.Simulation });
    this.world.addSystem(new CollisionSystem2D() as any, { phase: SystemPhase.Collision });
    this.world.addSystem(new FlappyBirdCollisionSystem(this), { phase: SystemPhase.GameRules });
    this.world.addSystem(this.gameStateSystem, { phase: SystemPhase.GameRules });

    const activeMutators = MutatorService.getActiveMutatorsForGame(this.gameId);
    this.world.addSystem(new MutatorSystem(activeMutators) as any, { phase: SystemPhase.Simulation });

    // Visual / Presentation
    this.world.addSystem(new JuiceSystem() as any, { phase: SystemPhase.Presentation });
    this.world.addSystem(new FlappyBirdRenderSystem(), { phase: SystemPhase.Presentation });

    if (!this.networkManager) {
      this.networkManager = NetworkManager.registerGame(this.gameId, this, {
        strategy: 'snapshot',
        interpolationDelay: 100
      });
    }
    this.world.addSystem(new ReplicationSystem(this.networkManager) as any, { phase: SystemPhase.Presentation });
  }

  protected override async onInitializeEntities(): Promise<void> {
    if (this.isMultiplayer) return;
    createGameState(this.world as any);
    createBird({ world: this.world as any, x: FLAPPY_CONFIG.BIRD_X, y: FLAPPY_CONFIG.BIRD_START_Y });
    createGround(this.world as any);
  }

  protected override async onBeforeRestart(): Promise<void> {
    this.gameStateSystem?.resetGameOverState(this.world);
    if (this.isMultiplayer) {
      this.networkManager?.reset();
    }
  }

  public override update(dt: number): void {
      this.world.update(dt);
  }

  private async onPreloadAssets(): Promise<void> {
    const audio = this.audio;
    try {
      await Promise.all([
        audio.loadSFX("flap", "/audio/flap.mp3"),
        audio.loadSFX("hit", "/audio/hit.mp3"),
        audio.loadSFX("score", "/audio/score.mp3"),
        audio.loadSFX("game_over", "/audio/game_over.mp3"),
      ]);
    } catch (e) {
      console.warn("[FlappyBird] Asset preloading failed.", e);
    }
  }

  public setMultiplayerMode(active: boolean) {
    this.isMultiplayer = active;
  }

  public setInput(input: Partial<FlappyBirdInput>) {
    Object.entries(input).forEach(([key, value]) => {
      this.unifiedInput.setOverride(key, !!value);
    });
  }

  public updateFromServer(state: Record<string, unknown>) {
    if (!this.isMultiplayer || !state) return;
    const world = this.getWorld();
    const commands = world.getCommandBuffer();
    const replicator = this.networkManager.getReplicator();

    const currentServerEntities = new Set<string>();

    if (state.players && typeof state.players === 'object') {
      const players = state.players as Record<string, { x: number, y: number, alive: boolean, velocityY: number }>;
      Object.entries(players).forEach(([sessionId, playerState]) => {
        const serverId = `player_${sessionId}`;
        currentServerEntities.add(serverId);

        const entity = replicator.resolveEntity(serverId, world);
        if (!world.hasComponent(entity, "Transform")) {
          commands.addComponent(entity, { type: "Transform", x: playerState.x, y: playerState.y, rotation: 0, scaleX: 1, scaleY: 1, worldX: playerState.x, worldY: playerState.y, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false } as TransformComponent);
          commands.addComponent(entity, { type: "Render", shape: "bird", size: 15, color: "yellow", rotation: 0, visible: true, opacity: 1, order: 0, hitFlashFrames: 0, angularVelocity: 0 } as RenderComponent);
          commands.addComponent(entity, {
            type: "Bird",
            velocityY: playerState.velocityY,
            isAlive: playerState.alive,
            isGliding: false,
            nearMissTimer: 0
          } as BirdComponent);
        }

        world.mutateComponent(entity, "Bird", bird => {
          bird.isAlive = playerState.alive;
          bird.velocityY = playerState.velocityY;
        });

        world.mutateComponent(entity, "Render", render => {
          render.color = playerState.alive ? "yellow" : "gray";
        });
      });
    }

    if (state.pipes && typeof state.pipes === 'object') {
      const pipes = state.pipes as Record<string, { x: number, gapY: number, id: string }>;
      Object.entries(pipes).forEach(([id, pipeState]) => {
        const serverId = `pipe_${id}`;
        currentServerEntities.add(serverId);

        const entity = replicator.resolveEntity(serverId, world);
        if (!world.hasComponent(entity, "Transform")) {
          commands.addComponent(entity, { type: "Transform", x: pipeState.x, y: 0, rotation: 0, scaleX: 1, scaleY: 1, worldX: pipeState.x, worldY: 0, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false } as TransformComponent);
          commands.addComponent(entity, { type: "Render", shape: "pipe", size: 60, color: "green", rotation: 0, visible: true, opacity: 1, order: 0, hitFlashFrames: 0, angularVelocity: 0 } as RenderComponent);
          commands.addComponent(entity, { type: "Pipe", gapY: pipeState.gapY, gapSize: 140, scored: false } as PipeComponent);
        }
      });
    }

    // Sync with NetworkManager for interpolation
    const snapshot: WorldSnapshot = {
        tick: (state.tick as number) || 0,
        entities: [],
        componentData: { Transform: {} },
        stateVersion: 0,
        structureVersion: 0,
        seed: 0,
        nextEntityId: 0,
        freeEntities: []
    };

    if (state.players) {
        Object.entries(state.players).forEach(([sessionId, p]: [string, Record<string, unknown>]) => {
            const entityId = replicator.getLocalId(`player_${sessionId}`);
            if (entityId !== undefined) {
                snapshot.entities.push(entityId);
                snapshot.componentData["Transform"][entityId] = { type: "Transform", x: (p as any).x, y: (p as any).y, rotation: 0, scaleX: 1, scaleY: 1, worldX: (p as any).x, worldY: (p as any).y, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false };
            }
        });
    }
    if (state.pipes) {
        Object.entries(state.pipes).forEach(([id, p]: [string, Record<string, unknown>]) => {
            const entityId = replicator.getLocalId(`pipe_${id}`);
            if (entityId !== undefined) {
                snapshot.entities.push(entityId);
                snapshot.componentData["Transform"][entityId] = { type: "Transform", x: (p as any).x, y: 0, rotation: 0, scaleX: 1, scaleY: 1, worldX: (p as any).x, worldY: 0, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false };
            }
        });
    }

    this.networkManager.processServerUpdate(snapshot.tick, snapshot);

    // Cleanup removed entities
    replicator.getMappings().forEach((entity: number, serverId: string) => {
      if (!currentServerEntities.has(serverId)) {
        commands.removeEntity(entity);
        replicator.removeMapping(serverId);
      }
    });

    if (!world.isUpdating) {
        world.flush();
    }
  }

  public initializeRenderer(renderer: Renderer<any>): void {
    if ((renderer as any).type === "canvas") {
      (renderer as any).registerShape("bird", drawFlappyBird);
      (renderer as any).registerShape("pipe", drawFlappyPipe);
      (renderer as any).registerShape("ground", drawFlappyGround);
      (renderer as any).registerBackgroundEffect("scrollingSky", scrollingBackgroundEffect);
    }
  }

  public getGameState(): FlappyBirdState {
    const state = this.getWorld().getSingleton("FlappyState");
    return state ? { ...state } : INITIAL_FLAPPY_STATE;
  }

  public isGameOver(): boolean {
    return this.getGameState().isGameOver;
  }

  public getWorld(): World<FlappyBirdComponentRegistry> {
    return this.world;
  }
}

export class NullFlappyBirdGame implements IFlappyBirdGame {
  public isMultiplayer = false;
  public gameId = "flappybird";
  private _world = new World<FlappyBirdComponentRegistry>();
  private _loop = new GameLoop();
  public async init() {}
  public start() {} public stop() {} public pause() {} public resume() {}
  public async restart() {} public destroy() {}
  public getWorld() { return this._world; }
  public getGameLoop() { return this._loop; }
  public getEventBus() { return new EventBus(); }
  public isPausedState() { return false; }
  public isGameOver() { return false; }
  public getGameState() { return INITIAL_FLAPPY_STATE; }
  public getSeed() { return 0; }
  public setInput(input: Partial<FlappyBirdInput>) {}
  public subscribe(cb: (state: FlappyBirdState) => void) { return () => {}; }
  public initializeRenderer() {}
  public getInputSystem() { return new UnifiedInputSystem() as any; }
}
