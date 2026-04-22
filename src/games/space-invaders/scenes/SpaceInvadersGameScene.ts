import { Scene } from "../../../engine/scenes/Scene";
import { World } from "../../../engine/core/World";
import { MovementSystem } from "../../../engine/systems/MovementSystem";
import { TTLSystem } from "../../../engine/systems/TTLSystem";
import { JuiceSystem } from "../../../engine/systems/JuiceSystem";
import { RenderUpdateSystem } from "../../../engine/systems/RenderUpdateSystem";
import { SpaceInvadersInputSystem } from "../systems/SpaceInvadersInputSystem";
import { BoundarySystem } from "../../../engine/systems/BoundarySystem";
import { SpaceInvadersFormationSystem } from "../systems/SpaceInvadersFormationSystem";
import { SpaceInvadersCollisionSystem } from "../systems/SpaceInvadersCollisionSystem";
import { SpaceInvadersGameStateSystem } from "../systems/SpaceInvadersGameStateSystem";
import { CollisionSystem2D } from "../../../engine/physics/collision/CollisionSystem2D";
import { SpaceInvadersRenderSystem } from "../systems/SpaceInvadersRenderSystem";
import { KamikazeSystem } from "../systems/KamikazeSystem";
import { BossSystem } from "../systems/BossSystem";
import { PlayerBulletPool, EnemyBulletPool, ParticlePool } from "../EntityPool";
import {
  createPlayer,
  createGameState,
  createFormationController,
  spawnInvaderWave,
  spawnShields
} from "../EntityFactory";
import { GAME_CONFIG } from "../types/SpaceInvadersTypes";
import { ISpaceInvadersGame } from "../types/GameInterfaces";

/**
 * Main gameplay scene for Space Invaders.
 */
export class SpaceInvadersGameScene extends Scene {
  private game: ISpaceInvadersGame;
  private playerBulletPool: PlayerBulletPool;
  private enemyBulletPool: EnemyBulletPool;
  private particlePool: ParticlePool;
  private config: typeof GAME_CONFIG;

  constructor(
    game: ISpaceInvadersGame,
    playerBulletPool: PlayerBulletPool,
    enemyBulletPool: EnemyBulletPool,
    particlePool: ParticlePool,
    config: typeof GAME_CONFIG = GAME_CONFIG
  ) {
    // Note: in this engine, Scene creates its own World if not provided
    // but the constructor requires a World.
    super(new World());
    this.game = game;
    this.playerBulletPool = playerBulletPool;
    this.enemyBulletPool = enemyBulletPool;
    this.particlePool = particlePool;
    this.config = config;
  }

  public onEnter(): void {
    // Inject EventBus and other engine resources into the scene world
    const eventBus = (this.game as unknown as { eventBus: import("../../../engine/core/EventBus").EventBus }).eventBus;
    if (eventBus) {
      this.world.setResource("EventBus", eventBus);
    }

    // 1. Systems registration
    const inputSys = new SpaceInvadersInputSystem(this.playerBulletPool);
    if (this.game.isMultiplayer) inputSys.setMultiplayerMode(true);

    this.world.addSystem(inputSys);
    this.world.addSystem(new MovementSystem());
    this.world.addSystem(new JuiceSystem());
    this.world.addSystem(new BoundarySystem());
    this.world.addSystem(new SpaceInvadersFormationSystem(this.enemyBulletPool));
    this.world.addSystem(new CollisionSystem2D());
    this.world.addSystem(new SpaceInvadersCollisionSystem(this.particlePool));
    this.world.addSystem(new KamikazeSystem());
    this.world.addSystem(new BossSystem());
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
