import { World } from "../../engine/core/World";
import { BaseGame } from "../../engine/core/BaseGame";
import { GameStateComponent, InputState, GAME_CONFIG, INITIAL_GAME_STATE } from "./types/SpaceInvadersTypes";
import { ISpaceInvadersGame } from "./types/GameInterfaces";
import { PlayerBulletPool, EnemyBulletPool, ParticlePool } from "./EntityPool";
import { KeyboardController } from "../../engine/input/KeyboardController";
import { TouchController } from "../../engine/input/TouchController";
import { SpaceInvadersGameScene } from "./scenes/SpaceInvadersGameScene";
import { Renderer } from "../../engine/rendering/Renderer";
import { getGameState } from "./GameUtils";
import {
  drawSpaceInvadersPlayer,
  drawSpaceInvadersInvader,
  drawSpaceInvadersBullet,
  drawSpaceInvadersShield,
  drawSpaceInvadersParticle,
  spaceInvadersScreenShakeEffect
} from "./rendering/SpaceInvadersCanvasVisuals";

/**
 * Main game controller for Space Invaders.
 */
export class SpaceInvadersGame
  extends BaseGame<GameStateComponent, InputState>
  implements ISpaceInvadersGame {

  private playerBulletPool: PlayerBulletPool;
  private enemyBulletPool: EnemyBulletPool;
  private particlePool: ParticlePool;
  private isMultiplayer = false;

  constructor() {
    super({
      pauseKey: GAME_CONFIG.KEYS.PAUSE,
      restartKey: GAME_CONFIG.KEYS.RESTART
    });
  }

  protected registerSystems(): void {
    if (!this.playerBulletPool) this.playerBulletPool = new PlayerBulletPool();
    if (!this.enemyBulletPool) this.enemyBulletPool = new EnemyBulletPool();
    if (!this.particlePool) this.particlePool = new ParticlePool();

    const DEFAULT_INPUT: InputState = {
      moveLeft: false,
      moveRight: false,
      shoot: false
    };

    const SI_KEYMAP = {
      [GAME_CONFIG.KEYS.LEFT]: "moveLeft" as const,
      [GAME_CONFIG.KEYS.RIGHT]: "moveRight" as const,
      [GAME_CONFIG.KEYS.SHOOT]: "shoot" as const,
    };

    // Ensure controllers are not duplicated on restart
    this.inputManager.cleanup();
    this.inputManager.addController(new KeyboardController<InputState>(SI_KEYMAP, DEFAULT_INPUT));
    this.inputManager.addController(new TouchController<InputState>());

    // We use a scene to manage systems and entities
    const gameScene = new SpaceInvadersGameScene(
      this,
      this.inputManager,
      this.playerBulletPool,
      this.enemyBulletPool,
      this.particlePool
    );

    this.sceneManager.transitionTo(gameScene);
  }

  protected initializeEntities(): void {
    // Handled by SpaceInvadersGameScene.onEnter()
  }

  public initializeRenderer(renderer: Renderer): void {
    if (renderer.type === "canvas") {
      renderer.registerShape("player_ship", drawSpaceInvadersPlayer);
      renderer.registerShape("invader", drawSpaceInvadersInvader);
      renderer.registerShape("player_bullet", drawSpaceInvadersBullet);
      renderer.registerShape("enemy_bullet", drawSpaceInvadersBullet); // Reuse bullet drawer
      renderer.registerShape("shield_block", drawSpaceInvadersShield);
      renderer.registerShape("particle", drawSpaceInvadersParticle);
      renderer.registerBackgroundEffect("screenshake", spaceInvadersScreenShakeEffect);
    }
  }

  public getGameState(): GameStateComponent {
    const world = this.getWorld();
    return getGameState(world);
  }

  public getWorld(): World {
    // Override to ensure we get the world from the scene
    return this.sceneManager.getCurrentScene()?.getWorld() || this.world;
  }

  public setMultiplayerMode(active: boolean) {
    this.isMultiplayer = active;
  }

  public updateFromServer(state: any) {
    if (!this.isMultiplayer || !state) return;
    const world = this.getWorld();
    world.clear();

    if (state.players) {
      state.players.forEach((player: any) => {
        const p = world.createEntity();
        world.addComponent(p, { type: "Transform", x: player.x, y: player.y, rotation: 0, scaleX: 1, scaleY: 1 });
        world.addComponent(p, { type: "Render", shape: "player_ship", size: 20, color: player.alive ? "green" : "red", rotation: 0 });
        world.addComponent(p, { type: "Player" });
      });
    }

    if (state.invaders) {
      state.invaders.forEach((invader: any) => {
        if (!invader.alive) return;
        const i = world.createEntity();
        world.addComponent(i, { type: "Transform", x: invader.x, y: invader.y, rotation: 0, scaleX: 1, scaleY: 1 });
        world.addComponent(i, { type: "Render", shape: "invader", size: 15, color: "white", rotation: 0 });
        world.addComponent(i, { type: "Invader", row: 0, col: 0, points: 10 });
      });
    }
  }

  public isGameOver(): boolean {
    return this.getGameState().isGameOver;
  }

  protected _onBeforeRestart(): void {
    this.registerSystems();
  }
}

export class NullSpaceInvadersGame implements ISpaceInvadersGame {
  private _world = new World();
  public start() {} public stop() {} public pause() {} public resume() {}
  public restart() {} public destroy() {}
  public getWorld() { return this._world; }
  public isPausedState() { return false; }
  public isGameOver() { return false; }
  public getGameState() { return INITIAL_GAME_STATE; }
  public setInput() {}
  public subscribe() { return () => {}; }
  public initializeRenderer() {}
}
