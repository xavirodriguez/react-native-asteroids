import { Scene } from "@tiny-aster/core";
import { World } from "@tiny-aster/core";
import { MovementSystem } from "@tiny-aster/core";
import { BoundarySystem } from "@tiny-aster/core";
import { FrictionSystem } from "@tiny-aster/core";
import { ScreenShakeSystem } from "@tiny-aster/core";
import { TTLSystem } from "@tiny-aster/core";
import { AsteroidCollisionSystem } from "../systems/AsteroidCollisionSystem";
import { AsteroidInputSystem } from "../systems/AsteroidInputSystem";
import { CollisionSystem2D } from "@tiny-aster/core";
import { UfoSystem } from "../systems/UfoSystem";
import { AsteroidRenderSystem } from "../systems/AsteroidRenderSystem";
import { IGameStateSystem } from "../types/GameInterfaces";
import { createShip, spawnAsteroidWave, createGameState } from "../EntityFactory";
import { AsteroidConfig } from "../types/AsteroidConfigSchema";
import { BulletPool, ParticlePool } from "../EntityPool";
import { IAsteroidsGame } from "../types/GameInterfaces";

export class AsteroidsGameScene extends Scene {
  private game: IAsteroidsGame;
  private bulletPool: BulletPool;
  private particlePool: ParticlePool;
  private gameStateSystem: IGameStateSystem;
  private config: AsteroidConfig;

  constructor(
    world: World,
    game: IAsteroidsGame,
    bulletPool: BulletPool,
    particlePool: ParticlePool,
    gameStateSystem: IGameStateSystem,
    config?: AsteroidConfig
  ) {
    super(world);
    this.game = game;
    this.bulletPool = bulletPool;
    this.particlePool = particlePool;
    this.gameStateSystem = gameStateSystem;
    this.config = config || world.getResource<AsteroidConfig>("GameConfig")!;
  }

  public onEnter(): void {
    // Asegurar que el recurso esté disponible para todos los sistemas internos
    this.world.setResource("GameConfig", this.config);

    const inputSys = new AsteroidInputSystem(
      this.bulletPool,
      this.particlePool,
      this.config
    );

    this.world.addSystem(inputSys);
    this.world.addSystem(new MovementSystem());
    this.world.addSystem(new BoundarySystem());
    this.world.addSystem(new FrictionSystem());
    this.world.addSystem(new CollisionSystem2D());
    this.world.addSystem(new AsteroidCollisionSystem(this.particlePool));
    this.world.addSystem(new TTLSystem());
    this.world.addSystem(this.gameStateSystem);
    this.world.addSystem(new UfoSystem());
    this.world.addSystem(new ScreenShakeSystem());
    this.world.addSystem(new AsteroidRenderSystem(this.config.TRAIL_MAX_LENGTH));

    this.initializeEntities();
  }

  private initializeEntities(): void {
    createShip({ world: this.world, x: this.config.SCREEN_CENTER_X, y: this.config.SCREEN_CENTER_Y });
    createGameState({ world: this.world });
    spawnAsteroidWave({ world: this.world, count: this.config.INITIAL_ASTEROID_COUNT });
  }

  public override onRestartCleanup(): void {
    const gameplayRandom = this.world.gameplayRandom;
    gameplayRandom.setSeed(this.game.getSeed());

    const eventBus = this.world.getResource<import("@tiny-aster/core").EventBus>("EventBus");
    if (eventBus) {
        eventBus.clear();
    }
  }
}
