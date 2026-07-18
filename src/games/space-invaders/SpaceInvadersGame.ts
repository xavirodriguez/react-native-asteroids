import {
  World,
  GameLoop,
  BaseGame,
  WorldSnapshot,
  Component,
  TransformComponent,
  RenderComponent,
  EventBus,
  UnifiedInputSystem,
  InputSystem,
} from "@tiny-aster/core";
/* eslint-disable @typescript-eslint/no-require-imports */
import { GameStateComponent, InputState, INITIAL_GAME_STATE, SpaceInvadersComponentRegistry, GAME_CONFIG } from "./types/SpaceInvadersTypes";
import { SpaceInvadersConfigSchema, SpaceInvadersConfig } from "./types/SpaceInvadersConfigSchema";
import { ConfigService } from "@tiny-aster/core";
import { ISpaceInvadersGame } from "./types/GameInterfaces";
import { PlayerBulletPool, EnemyBulletPool, ParticlePool } from "./EntityPool";
import { SpaceInvadersGameScene } from "./scenes/SpaceInvadersGameScene";
import { Renderer } from "@tiny-aster/core";
import { LootSystem } from "@tiny-aster/core";
import { PowerUpSystem } from "@tiny-aster/core";
import { NetworkManager } from "@tiny-aster/core";
import { ReplicationSystem } from "@tiny-aster/core";
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
  extends BaseGame<GameStateComponent, InputState, SpaceInvadersComponentRegistry>
  implements ISpaceInvadersGame {

  public isMultiplayer = false;
  private playerBulletPool!: PlayerBulletPool;
  private enemyBulletPool!: EnemyBulletPool;
  private particlePool!: ParticlePool;
  private networkManager!: NetworkManager;
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
    this.isMultiplayer = !!config.isMultiplayer;
  }

  protected override async onRegisterSystems(): Promise<void> {
    const rawConfig = require("./config/space-invaders.json");
    const baseConfig = ConfigService.load(this.gameId, SpaceInvadersConfigSchema, rawConfig) as any;

    const mutators = MutatorService.getActiveMutatorsForGame(this.gameId);
    const enabled = await MutatorService.isMutatorModeEnabled();
    this.config = enabled
      ? mutators.reduce((cfg, m) => m.apply(cfg), { ...(baseConfig as any) }) as SpaceInvadersConfig
      : { ...(baseConfig as any) } as SpaceInvadersConfig;

    this.world.setResource("GameConfig", this.config);
    this.world.setResource("ScreenConfig", { width: GAME_CONFIG.SCREEN_WIDTH, height: GAME_CONFIG.SCREEN_HEIGHT });
    this._config.gameOptions = { ...this._config.gameOptions, ...this.config };

    await this.onPreloadAssets();

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

    if (!this.networkManager) {
      this.networkManager = NetworkManager.registerGame(this.gameId, this, {
          strategy: 'hybrid',
          interpolationDelay: 100
      });
    }
    sceneWorld.addSystem(new ReplicationSystem(this.networkManager));

    await this.sceneManager.transitionTo(gameScene);
  }

  protected override async onBeforeRestart(): Promise<void> {
    this.sceneManager?.destroy();
  }

  public override update(dt: number): void {
      this.world.update(dt);
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

  public initializeRenderer(renderer: Renderer<any>): void {
    if ((renderer as any).type === "canvas") {
      (renderer as any).registerShape("player_ship", drawSpaceInvadersPlayer);
      (renderer as any).registerShape("invader", drawSpaceInvadersInvader);
      (renderer as any).registerShape("player_bullet", drawSpaceInvadersBullet);
      (renderer as any).registerShape("enemy_bullet", drawSpaceInvadersBullet); // Reuse bullet drawer
      (renderer as any).registerShape("shield_block", drawSpaceInvadersShield);
      (renderer as any).registerShape("particle", drawSpaceInvadersParticle);
    }
  }

  public getGameState(): GameStateComponent {
    const world = this.getWorld();
    const state = world.getSingleton("GameState");
    return state ? { ...state } : INITIAL_GAME_STATE;
  }

  public getWorld(): World<SpaceInvadersComponentRegistry> {
    // Priority 1: Scene-specific world (active gameplay)
    const scene = this.sceneManager?.getCurrentScene();
    if (scene) {
      return scene.getWorld() as World<SpaceInvadersComponentRegistry>;
    }
    // Priority 2: Base world (loading/initialization)
    return this.world;
  }

  public setMultiplayerMode(active: boolean) {
    this.isMultiplayer = active;
  }

  public setInput(input: Partial<InputState>) {
    Object.entries(input).forEach(([key, value]) => {
      this.unifiedInput.setOverride(key, !!value);
    });
  }

  public updateFromServer(state: Record<string, unknown>) {
    if (!this.isMultiplayer || !state) return;
    const world = this.getWorld();
    const replicator = this.networkManager.getReplicator();
    const commands = world.getCommandBuffer();

    const currentServerEntities = new Set<string>();

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

    // Update Players
    if (state.players && typeof state.players === 'object') {
      const players = state.players as Record<string, { x: number, y: number, alive: boolean, sessionId?: string }>;
      Object.entries(players).forEach(([sessionId, playerState]) => {
        const serverId = `player_${sessionId}`;
        currentServerEntities.add(serverId);

        const entity = replicator.resolveEntity(serverId, world);
        if (!world.hasComponent(entity, "Transform")) {
          commands.addComponent(entity, { type: "Player" } as any);
          commands.addComponent(entity, { type: "Transform", x: playerState.x, y: playerState.y, rotation: 0, scaleX: 1, scaleY: 1, worldX: playerState.x, worldY: playerState.y, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false } as any);
          commands.addComponent(entity, { type: "Render", shape: "player_ship", size: 20, color: "green", rotation: 0, visible: true, opacity: 1, order: 0, hitFlashFrames: 0, angularVelocity: 0 } as any);
        }

        snapshot.entities.push(entity);
        snapshot.componentData["Transform"][entity] = { type: "Transform", x: playerState.x, y: playerState.y, rotation: 0, scaleX: 1, scaleY: 1, worldX: playerState.x, worldY: playerState.y, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false };

        world.mutateComponent(entity, "Render", render => {
          render.color = playerState.alive ? "green" : "red";
        });
      });
    }

    // Update Invaders
    if (state.invaders && typeof state.invaders === 'object') {
      const invaders = state.invaders as Record<string, { x: number, y: number, alive: boolean, id: string }>;
      Object.entries(invaders).forEach(([id, invaderState]) => {
        if (!invaderState.alive) return;
        const serverId = `invader_${id}`;
        currentServerEntities.add(serverId);

        const entity = replicator.resolveEntity(serverId, world);
        if (!world.hasComponent(entity, "Transform")) {
          commands.addComponent(entity, { type: "Invader", row: 0, col: 0, points: 10 } as any);
          commands.addComponent(entity, { type: "Transform", x: invaderState.x, y: invaderState.y, rotation: 0, scaleX: 1, scaleY: 1, worldX: invaderState.x, worldY: invaderState.y, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false } as any);
          commands.addComponent(entity, { type: "Render", shape: "invader", size: 15, color: "white", rotation: 0, visible: true, opacity: 1, order: 0, hitFlashFrames: 0, angularVelocity: 0 } as any);
        }

        snapshot.entities.push(entity);
        snapshot.componentData["Transform"][entity] = { type: "Transform", x: invaderState.x, y: invaderState.y, rotation: 0, scaleX: 1, scaleY: 1, worldX: invaderState.x, worldY: invaderState.y, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false };
      });
    }

    // Update Bullets
    if (state.bullets && typeof state.bullets === 'object') {
      const bullets = state.bullets as Record<string, { x: number, y: number, ownerId: string }>;
      Object.entries(bullets).forEach(([id, bulletState]) => {
        const serverId = `bullet_${id}`;
        currentServerEntities.add(serverId);

        const entity = replicator.resolveEntity(serverId, world);
        if (!world.hasComponent(entity, "Transform")) {
          commands.addComponent(entity, { type: "PlayerBullet" } as any);
          commands.addComponent(entity, { type: "Transform", x: bulletState.x, y: bulletState.y, rotation: 0, scaleX: 1, scaleY: 1, worldX: bulletState.x, worldY: bulletState.y, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false } as any);
          commands.addComponent(entity, { type: "Render", shape: "player_bullet", size: 5, color: "yellow", rotation: 0, visible: true, opacity: 1, order: 0, hitFlashFrames: 0, angularVelocity: 0 } as any);
        }

        snapshot.entities.push(entity);
        snapshot.componentData["Transform"][entity] = { type: "Transform", x: bulletState.x, y: bulletState.y, rotation: 0, scaleX: 1, scaleY: 1, worldX: bulletState.x, worldY: bulletState.y, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false };
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

  public isGameOver(): boolean {
    return this.getGameState().isGameOver;
  }

  public override start(): void {
    super.start();
    if (__DEV__) console.log("[SpaceInvadersGame] Simulation started");
  }

  public stop(): void {
    if (__DEV__) console.log("[SpaceInvadersGame] Simulation stopped");
  }

  public override pause(): void {
    super.pause();
    this.getWorld().setResource("IsPaused", true);
    if (__DEV__) console.log("[SpaceInvadersGame] Simulation paused");
  }

  public override resume(): void {
    super.resume();
    this.getWorld().setResource("IsPaused", false);
    if (__DEV__) console.log("[SpaceInvadersGame] Simulation resumed");
  }
}

export class NullSpaceInvadersGame implements ISpaceInvadersGame {
  public isMultiplayer = false;
  public gameId = "spaceinvaders";
  private _world = new World<SpaceInvadersComponentRegistry>();
  private _loop = new GameLoop();
  public getWorld() { return this._world; }
  public getGameLoop() { return this._loop; }
  public getEventBus() { return new EventBus(); }
  public isPausedState() { return false; }
  public isGameOver() { return false; }
  public getGameState() { return INITIAL_GAME_STATE; }
  public getSeed() { return 0; }
  public async init() {}
  public start() {}
  public pause() {}
  public resume() {}
  public destroy() {}
  public async restart() {}
  public subscribe(cb: (state: GameStateComponent) => void) { return () => {}; }
  public setInput(input: Partial<InputState>) {}
  public initializeRenderer() {}
  public getInputSystem(): InputSystem { return new UnifiedInputSystem(); }
}
