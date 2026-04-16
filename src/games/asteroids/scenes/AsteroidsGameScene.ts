import { Scene } from "../../../engine/scenes/Scene";
import { World } from "../../../engine/core/World";
import { MovementSystem } from "../../../engine/systems/MovementSystem";
import { BoundarySystem } from "../../../engine/systems/BoundarySystem";
import { FrictionSystem } from "../../../engine/systems/FrictionSystem";
import { ScreenShakeSystem } from "../../../engine/systems/ScreenShakeSystem";
import { TTLSystem } from "../../../engine/systems/TTLSystem";
import { AsteroidCollisionSystem } from "../systems/AsteroidCollisionSystem";
import { AsteroidInputSystem } from "../systems/AsteroidInputSystem";
import { CollisionSystem2D } from "../../../engine/physics/collision/CollisionSystem2D";
import { UfoSystem } from "../systems/UfoSystem";
import { AsteroidRenderSystem } from "../systems/AsteroidRenderSystem";
import { IGameStateSystem } from "../types/GameInterfaces";
import { createShip, spawnAsteroidWave, createGameState } from "../EntityFactory";
import { GAME_CONFIG } from "../types/AsteroidTypes";
import { BulletPool, ParticlePool } from "../EntityPool";
import { IAsteroidsGame } from "../types/GameInterfaces";
import { RandomService } from "../../../engine/utils/RandomService";

export class AsteroidsGameScene extends Scene {
  private game: IAsteroidsGame;
  private bulletPool: BulletPool;
  private particlePool: ParticlePool;
  private gameStateSystem: IGameStateSystem;

  constructor(
    world: World,
    game: IAsteroidsGame,
    bulletPool: BulletPool,
    particlePool: ParticlePool,
    gameStateSystem: IGameStateSystem
  ) {
    super(world);
    this.game = game;
    this.bulletPool = bulletPool;
    this.particlePool = particlePool;
    this.gameStateSystem = gameStateSystem;
  }

  public onEnter(): void {
    const inputSys = new AsteroidInputSystem(this.bulletPool, this.particlePool);

    this.world.addSystem(inputSys);
    this.world.addSystem(new MovementSystem());
    this.world.addSystem(new BoundarySystem());
    this.world.addSystem(new FrictionSystem());
    this.world.addSystem(new CollisionSystem2D());
    this.world.addSystem(new AsteroidCollisionSystem(this.particlePool));
    this.world.addSystem(new TTLSystem());
    this.world.addSystem(this.gameStateSystem as unknown as import("../../../engine/core/System").System);
    this.world.addSystem(new UfoSystem());
    this.world.addSystem(new ScreenShakeSystem());
    this.world.addSystem(new AsteroidRenderSystem());

    this.initializeEntities();
  }

  private initializeEntities(): void {
    createShip({ world: this.world, x: GAME_CONFIG.SCREEN_CENTER_X, y: GAME_CONFIG.SCREEN_CENTER_Y });
    createGameState({ world: this.world });
    spawnAsteroidWave({ world: this.world, count: GAME_CONFIG.INITIAL_ASTEROID_COUNT });
  }

  public override onRestartCleanup(): void {
    const gameplayRandom = RandomService.getInstance("gameplay");
    gameplayRandom.setSeed(this.game.getSeed());

    const eventBus = this.world.getResource<import("../../../engine/core/EventBus").EventBus>("EventBus");
    if (eventBus) {
        // Clear all listeners to avoid cross-scene duplication
        // Note: EventBus doesn't have a clearAll() but we should at least reset what we can.
        // For now, focusing on RandomService as requested.
    }
  }
}
