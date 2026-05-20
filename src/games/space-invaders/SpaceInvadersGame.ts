import { World } from "../../engine/core/World";
import { GameLoop } from "../../engine/core/GameLoop";
import { BaseGame } from "../../engine/core/BaseGame";
import { GameStateComponent, InputState, INITIAL_GAME_STATE } from "./types/SpaceInvadersTypes";
import { SpaceInvadersConfigSchema, SpaceInvadersConfig } from "./types/SpaceInvadersConfigSchema";
import { ConfigService } from "../../engine/services/ConfigService";
import { ISpaceInvadersGame } from "./types/GameInterfaces";
import { PlayerBulletPool, EnemyBulletPool, ParticlePool } from "./EntityPool";
import { SpaceInvadersGameScene } from "./scenes/SpaceInvadersGameScene";
import { Renderer } from "../../engine/rendering/Renderer";
import { LootSystem } from "../../engine/systems/LootSystem";
import { PowerUpSystem } from "../../engine/systems/PowerUpSystem";
import { InterpolationBuffer } from "../../multiplayer/InterpolationSystem";
import {
  drawSpaceInvadersPlayer,
  drawSpaceInvadersInvader,
  drawSpaceInvadersBullet,
  drawSpaceInvadersShield,
  drawSpaceInvadersParticle
} from "./rendering/SpaceInvadersCanvasVisuals";
import { MutatorService } from "../../services/MutatorService";

/**
 * Main controller for the Space Invaders game.
 *
 * @remarks
 * Manages the enemy horde lifecycle and wave progression.
 * Unlike Asteroids, it uses a rigid formation system where the movement
 * of one entity affects the whole group (Swarm movement).
 */
export class SpaceInvadersGame
  extends BaseGame<GameStateComponent, InputState>
  implements ISpaceInvadersGame {

  private playerBulletPool!: PlayerBulletPool;
  private enemyBulletPool!: EnemyBulletPool;
  private particlePool!: ParticlePool;
  private serverEntities = new Map<string, number>();
  private entityInterpolationBuffers = new Map<number, InterpolationBuffer>();
  private interpolationDelay = 100;
  public readonly gameId = "spaceinvaders";
  private config!: SpaceInvadersConfig;

  constructor(config: { isMultiplayer?: boolean, seed?: number, gameOptions?: Record<string, unknown> } = {}) {
    const seed = config.gameOptions?.seed as number || config.seed;
    const rawConfig = require("./config/space-invaders.json");
    super({
      pauseKey: rawConfig.KEYS.PAUSE,
      restartKey: rawConfig.KEYS.RESTART,
      isMultiplayer: config.isMultiplayer,
      gameOptions: { ...config.gameOptions, seed }
    });
  }

  public override async init(): Promise<void> {
    const rawConfig = require("./config/space-invaders.json");
    const baseConfig = ConfigService.load(this.gameId, SpaceInvadersConfigSchema, rawConfig);

    const mutators = MutatorService.getActiveMutatorsForGame(this.gameId);
    const enabled = await MutatorService.isMutatorModeEnabled();
    this.config = enabled
      ? mutators.reduce((cfg, m) => m.apply(cfg), { ...baseConfig }) as SpaceInvadersConfig
      : { ...baseConfig };

    this.world.setResource("GameConfig", this.config);
    this._config.gameOptions = { ...this._config.gameOptions, ...this.config };

    await this.onPreloadAssets();
    await super.init();
    await this.registerSystemsAsync();
  }

  private async onPreloadAssets(): Promise<void> {
    const audio = this.audio;
    try {
      await Promise.all([
        audio.loadSFX("shoot", "/audio/shoot.mp3"),
        audio.loadSFX("explosion", "/audio/explosion.mp3"),
        audio.loadSFX("hit", "/audio/hit.mp3"),
        audio.loadSFX("game_over", "/audio/game_over.mp3"),
      ]);
    } catch (e) {
      console.warn("[SpaceInvaders] Asset preloading failed.", e);
    }
  }

  protected registerSystems(): void {
    // Systems are registered asynchronously in init() via registerSystemsAsync()
  }

  protected initializeEntities(): void {
    // Handled by SpaceInvadersGameScene.onEnter()
  }

  public initializeRenderer(renderer: Renderer<unknown>): void {
    if (renderer.type === "canvas") {
      renderer.registerShape("player_ship", drawSpaceInvadersPlayer);
      renderer.registerShape("invader", drawSpaceInvadersInvader);
      renderer.registerShape("player_bullet", drawSpaceInvadersBullet);
      renderer.registerShape("enemy_bullet", drawSpaceInvadersBullet); // Reuse bullet drawer
      renderer.registerShape("shield_block", drawSpaceInvadersShield);
      renderer.registerShape("particle", drawSpaceInvadersParticle);
    }
  }

  public getGameState(): GameStateComponent {
    const world = this.getWorld();
    const state = world.getSingleton<GameStateComponent>("GameState");
    return state ? { ...state } : INITIAL_GAME_STATE;
  }

  public getWorld(): World {
    // Priority 1: Scene-specific world (active gameplay)
    const scene = this.sceneManager.getCurrentScene();
    if (scene) {
      return scene.getWorld();
    }
    // Priority 2: Base world (loading/initialization)
    return this.world;
  }

  public setMultiplayerMode(active: boolean) {
    this.isMultiplayer = active;
  }

  public updateFromServer(state: Record<string, unknown>) {
    if (!this.isMultiplayer || !state) return;
    const world = this.getWorld();

    const currentServerEntities = new Set<string>();

    // Update Players
    if (state.players && typeof state.players === 'object') {
      const players = state.players as Record<string, { x: number, y: number, alive: boolean, sessionId?: string }>;
      Object.entries(players).forEach(([sessionId, playerState]) => {
        const serverId = `player_${sessionId}`;
        currentServerEntities.add(serverId);

        let entity = this.serverEntities.get(serverId);
        if (entity === undefined || !world.hasEntity(entity)) {
          entity = world.createEntity();
          this.serverEntities.set(serverId, entity);
          world.addComponent(entity, { type: "Player" } as import("../../engine/types/EngineTypes").Component);
          world.addComponent(entity, { type: "Transform", x: playerState.x, y: playerState.y, rotation: 0, scaleX: 1, scaleY: 1 } as import("../../engine/types/EngineTypes").TransformComponent);
          world.addComponent(entity, { type: "Render", shape: "player_ship", size: 20, color: "green", rotation: 0 } as import("../../engine/types/EngineTypes").RenderComponent);
        }

        this.updateInterpolationBuffer(entity, playerState.x, playerState.y);

        const render = world.getComponent<import("../../engine/types/EngineTypes").RenderComponent>(entity, "Render");
        if (render) {
          render.color = playerState.alive ? "green" : "red";
        }
      });
    }

    // Update Invaders
    if (state.invaders && typeof state.invaders === 'object') {
      const invaders = state.invaders as Record<string, { x: number, y: number, alive: boolean, id: string }>;
      Object.entries(invaders).forEach(([id, invaderState]) => {
        if (!invaderState.alive) return;
        const serverId = `invader_${id}`;
        currentServerEntities.add(serverId);

        let entity = this.serverEntities.get(serverId);
        if (entity === undefined || !world.hasEntity(entity)) {
          entity = world.createEntity();
          this.serverEntities.set(serverId, entity);
          world.addComponent(entity, { type: "Invader", row: 0, col: 0, points: 10 } as import("./types/SpaceInvadersTypes").InvaderComponent);
          world.addComponent(entity, { type: "Transform", x: invaderState.x, y: invaderState.y, rotation: 0, scaleX: 1, scaleY: 1 } as import("../../engine/types/EngineTypes").TransformComponent);
          world.addComponent(entity, { type: "Render", shape: "invader", size: 15, color: "white", rotation: 0 } as import("../../engine/types/EngineTypes").RenderComponent);
        }

        this.updateInterpolationBuffer(entity, invaderState.x, invaderState.y);
      });
    }

    // Update Bullets
    if (state.bullets && typeof state.bullets === 'object') {
      const bullets = state.bullets as Record<string, { x: number, y: number, ownerId: string }>;
      Object.entries(bullets).forEach(([id, bulletState]) => {
        const serverId = `bullet_${id}`;
        currentServerEntities.add(serverId);

        let entity = this.serverEntities.get(serverId);
        if (entity === undefined || !world.hasEntity(entity)) {
          entity = world.createEntity();
          this.serverEntities.set(serverId, entity);
          world.addComponent(entity, { type: "PlayerBullet" } as import("../../engine/types/EngineTypes").Component);
          world.addComponent(entity, { type: "Transform", x: bulletState.x, y: bulletState.y, rotation: 0, scaleX: 1, scaleY: 1 } as import("../../engine/types/EngineTypes").TransformComponent);
          world.addComponent(entity, { type: "Render", shape: "player_bullet", size: 5, color: "yellow", rotation: 0 } as import("../../engine/types/EngineTypes").RenderComponent);
        }

        this.updateInterpolationBuffer(entity, bulletState.x, bulletState.y);
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
      tick: 0, // Not used for this simple interpolation
      x,
      y,
      timestamp: Date.now()
    });
  }

  public isGameOver(): boolean {
    return this.getGameState().isGameOver;
  }

  protected async _onBeforeRestart(): Promise<void> {
    // During restart, we DO want to await the full transition
    await this.registerSystemsAsync();
  }

  /**
   * Async version of registerSystems for use in restart()
   */
  private async registerSystemsAsync(): Promise<void> {
    if (!this.playerBulletPool) this.playerBulletPool = new PlayerBulletPool();
    if (!this.enemyBulletPool) this.enemyBulletPool = new EnemyBulletPool();
    if (!this.particlePool) this.particlePool = new ParticlePool();

    // Bind inputs for UnifiedInputSystem
    this.unifiedInput.bind("moveLeft", [this.config.KEYS.LEFT]);
    this.unifiedInput.bind("moveRight", [this.config.KEYS.RIGHT]);
    this.unifiedInput.bind("shoot", [this.config.KEYS.SHOOT]);

    const gameScene = new SpaceInvadersGameScene(
      this,
      this.playerBulletPool,
      this.enemyBulletPool,
      this.particlePool,
      this.config
    );

    // Register Power-up systems in the scene world
    const sceneWorld = gameScene.getWorld();
    sceneWorld.addSystem(new LootSystem());
    sceneWorld.addSystem(new PowerUpSystem());

    if (this.isMultiplayer) {
      sceneWorld.addSystem({
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

    await this.sceneManager.transitionTo(gameScene);
  }
}

export class NullSpaceInvadersGame implements ISpaceInvadersGame {
  public isMultiplayer = false;
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
