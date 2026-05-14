import { World } from "../../engine/core/World";
import { GameLoop } from "../../engine/core/GameLoop";
import { BaseGame } from "../../engine/core/BaseGame";
import { FlappyBirdState, FlappyBirdInput, FLAPPY_CONFIG, INITIAL_FLAPPY_STATE } from "./types/FlappyBirdTypes";
import { IFlappyBirdGame } from "./types/GameInterfaces";
import { FlappyBirdInputSystem } from "./systems/FlappyBirdInputSystem";
import { FlappyBirdCollisionSystem } from "./systems/FlappyBirdCollisionSystem";
import { FlappyBirdGameStateSystem } from "./systems/FlappyBirdGameStateSystem";
import { FlappyBirdRenderSystem } from "./systems/FlappyBirdRenderSystem";
import { FlappyBirdGlideSystem } from "./systems/FlappyBirdGlideSystem";
import { InputBufferSystem } from "../../engine/systems/InputBufferSystem";
import { MovementSystem } from "../../engine/physics/systems/MovementSystem";
import { CollisionSystem2D } from "../../engine/physics/collision/CollisionSystem2D";
import { JuiceSystem } from "../../engine/systems/JuiceSystem";
import { Renderer } from "../../engine/rendering/Renderer";
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
import { MutatorSystem } from "../../engine/systems/MutatorSystem";
import { InterpolationBuffer } from "../../multiplayer/InterpolationSystem";

/**
 * Controlador principal del juego Flappy Bird.
 *
 * @remarks
 * Implementa mecánicas de scroll infinito y generación procedural de obstáculos (tuberías).
 * Utiliza un sistema de gravedad simple y una única acción de entrada ("jump").
 */
export class FlappyBirdGame
  extends BaseGame<FlappyBirdState, FlappyBirdInput>
  implements IFlappyBirdGame {

  private gameStateSystem: FlappyBirdGameStateSystem;
  private serverEntities = new Map<string, number>();
  private entityInterpolationBuffers = new Map<number, InterpolationBuffer>();
  private interpolationDelay = 100;
  public readonly gameId = "flappybird";
  private config: typeof FLAPPY_CONFIG;

  constructor(config: { isMultiplayer?: boolean, seed?: number, gameOptions?: Record<string, unknown> } = {}) {
    const seed = config.gameOptions?.seed as number || config.seed;
    super({
      pauseKey: FLAPPY_CONFIG.KEYS.PAUSE,
      restartKey: FLAPPY_CONFIG.KEYS.RESTART,
      isMultiplayer: config.isMultiplayer,
      gameOptions: { ...config.gameOptions, seed }
    });
  }

  public override async init(): Promise<void> {
    const mutators = MutatorService.getActiveMutatorsForGame(this.gameId);
    const enabled = await MutatorService.isMutatorModeEnabled();
    this.config = enabled
      ? mutators.reduce((cfg, m) => m.apply(cfg), { ...FLAPPY_CONFIG })
      : { ...FLAPPY_CONFIG };
    this._config.gameOptions = { ...this._config.gameOptions, ...this.config };

    await this.onPreloadAssets();
    await super.init();
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

  protected registerSystems(): void {
    // Bind inputs for UnifiedInputSystem
    this.unifiedInput.bind("flap", [FLAPPY_CONFIG.KEYS.FLAP]);

    this.gameStateSystem = new FlappyBirdGameStateSystem(this, this.config);

    const inputSys = new FlappyBirdInputSystem(this.config);
    if (this.isMultiplayer) inputSys.setMultiplayerMode(true);

    this.world.addSystem(this.unifiedInput);
    this.world.addSystem(new InputBufferSystem());
    this.world.addSystem(inputSys);
    this.world.addSystem(new FlappyBirdGlideSystem());
    this.world.addSystem(new MovementSystem());
    this.world.addSystem(new JuiceSystem());
    this.world.addSystem(new CollisionSystem2D());
    this.world.addSystem(new FlappyBirdCollisionSystem(this));
    this.world.addSystem(this.gameStateSystem);

    const activeMutators = MutatorService.getActiveMutatorsForGame(this.gameId);
    this.world.addSystem(new MutatorSystem(activeMutators));
    this.world.addSystem(new FlappyBirdRenderSystem());

    if (this.isMultiplayer) {
      this.world.addSystem({
        update: (world) => {
          const targetTime = Date.now() - this.interpolationDelay;
          this.entityInterpolationBuffers.forEach((buffer, entityId) => {
            const data = buffer.getAt(targetTime);
            if (data) {
              const transform = world.getComponent<import("../../engine/types/EngineTypes").TransformComponent>(entityId, "Transform");
              if (transform) {
                transform.x = data.prev.x + (data.next.x - data.prev.x) * data.alpha;
                transform.y = data.prev.y + (data.next.y - data.prev.y) * data.alpha;
              }
            }
          });
        }
      });
    }
  }

  public setMultiplayerMode(active: boolean) {
    this.isMultiplayer = active;
  }

  public updateFromServer(state: Record<string, unknown>) {
    if (!this.isMultiplayer || !state) return;
    const world = this.getWorld();

    const currentServerEntities = new Set<string>();

    if (state.players && typeof state.players === 'object') {
      const players = state.players as Record<string, { x: number, y: number, alive: boolean, velocityY: number }>;
      Object.entries(players).forEach(([sessionId, playerState]) => {
        const serverId = `player_${sessionId}`;
        currentServerEntities.add(serverId);

        let entity = this.serverEntities.get(serverId);
        if (entity === undefined || !world.hasEntity(entity)) {
          entity = world.createEntity();
          this.serverEntities.set(serverId, entity);
          world.addComponent(entity, { type: "Transform", x: playerState.x, y: playerState.y, rotation: 0, scaleX: 1, scaleY: 1 } as import("../../engine/types/EngineTypes").TransformComponent);
          world.addComponent(entity, { type: "Render", shape: "bird", size: 15, color: "yellow", rotation: 0 } as import("../../engine/types/EngineTypes").RenderComponent);
          world.addComponent(entity, {
            type: "Bird",
            velocityY: playerState.velocityY,
            isAlive: playerState.alive,
            isGliding: false,
            nearMissTimer: 0
          } as import("./EntityFactory").BirdComponent);
        }

        this.updateInterpolationBuffer(entity, playerState.x, playerState.y);

        const bird = world.getComponent<import("./EntityFactory").BirdComponent>(entity, "Bird");
        if (bird) {
          bird.isAlive = playerState.alive;
          bird.velocityY = playerState.velocityY;
        }

        const render = world.getComponent<import("../../engine/types/EngineTypes").RenderComponent>(entity, "Render");
        if (render) {
          render.color = playerState.alive ? "yellow" : "gray";
        }
      });
    }

    if (state.pipes && typeof state.pipes === 'object') {
      const pipes = state.pipes as Record<string, { x: number, gapY: number, id: string }>;
      Object.entries(pipes).forEach(([id, pipeState]) => {
        const serverId = `pipe_${id}`;
        currentServerEntities.add(serverId);

        let entity = this.serverEntities.get(serverId);
        if (entity === undefined || !world.hasEntity(entity)) {
          entity = world.createEntity();
          this.serverEntities.set(serverId, entity);
          world.addComponent(entity, { type: "Transform", x: pipeState.x, y: 0, rotation: 0, scaleX: 1, scaleY: 1 } as import("../../engine/types/EngineTypes").TransformComponent);
          world.addComponent(entity, { type: "Render", shape: "pipe", size: 60, color: "green", rotation: 0 } as import("../../engine/types/EngineTypes").RenderComponent);
          world.addComponent(entity, { type: "Pipe", gapY: pipeState.gapY, gapSize: 140, scored: false } as import("./EntityFactory").PipeComponent);
        }

        this.updateInterpolationBuffer(entity, pipeState.x, 0);
      });
    }

    // Cleanup removed entities
    this.serverEntities.forEach((entity, serverId) => {
      if (!currentServerEntities.has(serverId)) {
        if (world.hasEntity(entity)) {
          world.removeEntity(entity);
        }
        this.serverEntities.delete(serverId);
        this.entityInterpolationBuffers.delete(entity);
      }
    });
  }

  private updateInterpolationBuffer(entityId: number, x: number, y: number) {
    let buffer = this.entityInterpolationBuffers.get(entityId);
    if (!buffer) {
      buffer = new InterpolationBuffer();
      this.entityInterpolationBuffers.set(entityId, buffer);
    }
    buffer.push({
      tick: 0,
      x,
      y,
      timestamp: Date.now()
    });
  }

  protected initializeEntities(): void {
    if (this.isMultiplayer) return;
    createGameState(this.world);
    createBird({ world: this.world, x: FLAPPY_CONFIG.BIRD_X, y: FLAPPY_CONFIG.BIRD_START_Y });
    createGround(this.world);
  }

  public initializeRenderer(renderer: Renderer<unknown>): void {
    if (renderer.type === "canvas") {
      renderer.registerShape("bird", drawFlappyBird);
      renderer.registerShape("pipe", drawFlappyPipe);
      renderer.registerShape("ground", drawFlappyGround);
      renderer.registerBackgroundEffect("scrollingSky", scrollingBackgroundEffect);
    }
  }

  public getGameState(): FlappyBirdState {
    const state = this.getWorld().getSingleton<FlappyBirdState>("FlappyState");
    return state ? { ...state } : INITIAL_FLAPPY_STATE;
  }

  public isGameOver(): boolean {
    return this.getGameState().isGameOver;
  }

  protected _onBeforeRestart(): void {
    this.gameStateSystem.resetGameOverState(this.world);
  }
}

export class NullFlappyBirdGame implements IFlappyBirdGame {
  private _world = new World();
  private _loop = new GameLoop();
  public start() {} public stop() {} public pause() {} public resume() {}
  public async restart() {} public destroy() {}
  public getWorld() { return this._world; }
  public getGameLoop() { return this._loop; }
  public isPausedState() { return false; }
  public isGameOver() { return false; }
  public getGameState() { return INITIAL_FLAPPY_STATE; }
  public getSeed() { return 0; }
  public setInput() {}
  public subscribe() { return () => {}; }
  public initializeRenderer() {}
}
