import { World } from "../../engine/core/World";
import { GameLoop } from "../../engine/core/GameLoop";
import { BaseGame } from "../../engine/core/BaseGame";
import { GameStateComponent, InputState, GAME_CONFIG, INITIAL_GAME_STATE } from "./types/SpaceInvadersTypes";
import { ISpaceInvadersGame } from "./types/GameInterfaces";
import { PlayerBulletPool, EnemyBulletPool, ParticlePool } from "./EntityPool";
import { SpaceInvadersGameScene } from "./scenes/SpaceInvadersGameScene";
import { Renderer } from "../../engine/rendering/Renderer";
import { LootSystem } from "../../engine/systems/LootSystem";
import { PowerUpSystem } from "../../engine/systems/PowerUpSystem";
import {
  drawSpaceInvadersPlayer,
  drawSpaceInvadersInvader,
  drawSpaceInvadersBullet,
  drawSpaceInvadersShield,
  drawSpaceInvadersParticle
} from "./rendering/SpaceInvadersCanvasVisuals";
import { MutatorService } from "../../services/MutatorService";

/**
 * Controlador principal del juego Space Invaders.
 *
 * @remarks
 * Gestiona el ciclo de vida de la horda de enemigos y la progresión de oleadas.
 * A diferencia de Asteroids, utiliza un sistema de formación rígida donde el movimiento
 * de una entidad afecta a todo el grupo (Swarm movement).
 */
export class SpaceInvadersGame
  extends BaseGame<GameStateComponent, InputState>
  implements ISpaceInvadersGame {

  private playerBulletPool!: PlayerBulletPool;
  private enemyBulletPool!: EnemyBulletPool;
  private particlePool!: ParticlePool;
  public readonly gameId = "spaceinvaders";
  private config!: typeof GAME_CONFIG;

  constructor(config: { isMultiplayer?: boolean, seed?: number, gameOptions?: Record<string, unknown> } = {}) {
    const seed = config.gameOptions?.seed as number || config.seed;
    super({
      pauseKey: GAME_CONFIG.KEYS.PAUSE,
      restartKey: GAME_CONFIG.KEYS.RESTART,
      isMultiplayer: config.isMultiplayer,
      gameOptions: { ...config.gameOptions, seed }
    });
  }

  public override async init(): Promise<void> {
    const mutators = MutatorService.getActiveMutatorsForGame(this.gameId);
    const enabled = await MutatorService.isMutatorModeEnabled();
    this.config = enabled
      ? mutators.reduce((cfg, m) => m.apply(cfg), { ...GAME_CONFIG }) as typeof GAME_CONFIG
      : { ...GAME_CONFIG };

    await this.onPreloadAssets();
    await super.init();
    await this.registerSystemsAsync();
  }

  private async onPreloadAssets(): Promise<void> {
    const audio = this.audio;
    try {
      await Promise.all([
        audio.loadSFX("shoot", "/assets/audio/shoot.mp3"),
        audio.loadSFX("explosion", "/assets/audio/explosion.mp3"),
        audio.loadSFX("hit", "/assets/audio/hit.mp3"),
        audio.loadSFX("game_over", "/assets/audio/game_over.mp3"),
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
    world.clear();

    if (state.players && typeof state.players === 'object') {
      Object.values(state.players).forEach((player: unknown) => {
        const p = world.createEntity();
        const playerState = player as { x: number, y: number, alive: boolean };
        world.addComponent(p, { type: "Transform", x: playerState.x, y: playerState.y, rotation: 0, scaleX: 1, scaleY: 1 } as import("../../engine/types/EngineTypes").TransformComponent);
        world.addComponent(p, { type: "Render", shape: "player_ship", size: 20, color: playerState.alive ? "green" : "red", rotation: 0 } as import("../../engine/types/EngineTypes").RenderComponent);
        world.addComponent(p, { type: "Player" } as import("../../engine/types/EngineTypes").Component);
      });
    }

    if (state.invaders && typeof state.invaders === 'object') {
      Object.values(state.invaders).forEach((invader: unknown) => {
        const invaderState = invader as { x: number, y: number, alive: boolean };
        if (!invaderState.alive) return;
        const i = world.createEntity();
        world.addComponent(i, { type: "Transform", x: invaderState.x, y: invaderState.y, rotation: 0, scaleX: 1, scaleY: 1 } as import("../../engine/types/EngineTypes").TransformComponent);
        world.addComponent(i, { type: "Render", shape: "invader", size: 15, color: "white", rotation: 0 } as import("../../engine/types/EngineTypes").RenderComponent);
        world.addComponent(i, { type: "Invader", row: 0, col: 0, points: 10 } as import("./types/SpaceInvadersTypes").InvaderComponent);
      });
    }
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
    this.unifiedInput.bind("moveLeft", [GAME_CONFIG.KEYS.LEFT]);
    this.unifiedInput.bind("moveRight", [GAME_CONFIG.KEYS.RIGHT]);
    this.unifiedInput.bind("shoot", [GAME_CONFIG.KEYS.SHOOT]);

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
  public subscribe() { return () => {}; }
  public initializeRenderer() {}
}
