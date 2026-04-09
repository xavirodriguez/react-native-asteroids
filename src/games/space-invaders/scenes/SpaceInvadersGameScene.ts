import { Scene } from "../../../engine/scenes/Scene";
import { World } from "../../../engine/core/World";
import { InputManager } from "../../../engine/input/InputManager";
import { MovementSystem } from "../../../engine/systems/MovementSystem";
import { TTLSystem } from "../../../engine/systems/TTLSystem";
import { RenderUpdateSystem } from "../../../engine/systems/RenderUpdateSystem";
import { SpaceInvadersInputSystem } from "../systems/SpaceInvadersInputSystem";
import { BoundarySystem } from "../systems/BoundarySystem";
import { SpaceInvadersFormationSystem } from "../systems/SpaceInvadersFormationSystem";
import { SpaceInvadersCollisionSystem } from "../systems/SpaceInvadersCollisionSystem";
import { SpaceInvadersGameStateSystem } from "../systems/SpaceInvadersGameStateSystem";
import { SpaceInvadersRenderSystem } from "../systems/SpaceInvadersRenderSystem";
import { PlayerBulletPool, EnemyBulletPool, ParticlePool } from "../EntityPool";
import {
  createPlayer,
  createGameState,
  createFormationController,
  spawnInvaderWave,
  spawnShields
} from "../EntityFactory";
import { InputState, GAME_CONFIG } from "../types/SpaceInvadersTypes";
import { ISpaceInvadersGame } from "../types/GameInterfaces";

/**
 * Main gameplay scene for Space Invaders.
 */
export class SpaceInvadersGameScene extends Scene {
  private game: ISpaceInvadersGame;
  private inputManager: InputManager<InputState>;
  private playerBulletPool: PlayerBulletPool;
  private enemyBulletPool: EnemyBulletPool;
  private particlePool: ParticlePool;
  private config: typeof GAME_CONFIG;

  constructor(
    game: ISpaceInvadersGame,
    inputManager: InputManager<InputState>,
    playerBulletPool: PlayerBulletPool,
    enemyBulletPool: EnemyBulletPool,
    particlePool: ParticlePool,
    config: typeof GAME_CONFIG = GAME_CONFIG
  ) {
    // Note: in this engine, Scene creates its own World if not provided
    // but the constructor requires a World.
    super(new World());
    this.game = game;
    this.inputManager = inputManager;
    this.playerBulletPool = playerBulletPool;
    this.enemyBulletPool = enemyBulletPool;
    this.particlePool = particlePool;
    this.config = config;
  }

  public onEnter(): void {
    // 1. Systems registration
    const inputSys = new SpaceInvadersInputSystem(this.inputManager, this.playerBulletPool);
    if (this.game.isMultiplayer) inputSys.setMultiplayerMode(true);

    this.world.addSystem(inputSys);
    this.world.addSystem(new MovementSystem());
    this.world.addSystem(new BoundarySystem());
    this.world.addSystem(new SpaceInvadersFormationSystem(this.enemyBulletPool));
    this.world.addSystem(new SpaceInvadersCollisionSystem(this.particlePool));
    this.world.addSystem(new TTLSystem());
    this.world.addSystem(new SpaceInvadersGameStateSystem(this.game));
    this.world.addSystem(new RenderUpdateSystem(0)); // No trails
    this.world.addSystem(new SpaceInvadersRenderSystem());

    // 2. Initial entities
    if (this.game.isMultiplayer) return; // Wait for server state
    createGameState(this.world);
    createPlayer(this.world, this.config.SCREEN_CENTER_X, this.config.SCREEN_HEIGHT - 50);
    createFormationController(this.world);
    spawnInvaderWave(this.world, 1);
    spawnShields(this.world);
  }
}
