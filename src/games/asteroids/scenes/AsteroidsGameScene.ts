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
import { GAME_CONFIG, type InputState } from "../types/AsteroidTypes";
import { KeyboardController } from "../../../engine/input/KeyboardController";
import { TouchController } from "../../../engine/input/TouchController";
import { InputManager } from "../../../engine/input/InputManager";
import { BulletPool, ParticlePool } from "../EntityPool";
import { IAsteroidsGame } from "../types/GameInterfaces";

export class AsteroidsGameScene extends Scene {
  private game: IAsteroidsGame;
  private inputManager: InputManager<InputState>;
  private bulletPool: BulletPool;
  private particlePool: ParticlePool;
  private gameStateSystem: IGameStateSystem;

  constructor(
    world: World,
    game: IAsteroidsGame,
    inputManager: InputManager<InputState>,
    bulletPool: BulletPool,
    particlePool: ParticlePool,
    gameStateSystem: IGameStateSystem
  ) {
    super(world);
    this.game = game;
    this.inputManager = inputManager;
    this.bulletPool = bulletPool;
    this.particlePool = particlePool;
    this.gameStateSystem = gameStateSystem;
  }

  public onEnter(): void {
    // Ensure clean input state
    this.inputManager.clearControllers();

    const DEFAULT_INPUT: InputState = {
      thrust: false, rotateLeft: false, rotateRight: false,
      shoot: false, hyperspace: false
    };

    const ASTEROID_KEYMAP = {
      [GAME_CONFIG.KEYS.THRUST]: "thrust" as const,
      [GAME_CONFIG.KEYS.ROTATE_LEFT]: "rotateLeft" as const,
      [GAME_CONFIG.KEYS.ROTATE_RIGHT]: "rotateRight" as const,
      [GAME_CONFIG.KEYS.SHOOT]: "shoot" as const,
      [GAME_CONFIG.KEYS.HYPERSPACE]: "hyperspace" as const,
    };

    this.inputManager.addController(new KeyboardController<InputState>(ASTEROID_KEYMAP, DEFAULT_INPUT));
    this.inputManager.addController(new TouchController<InputState>());

    const inputSys = new AsteroidInputSystem(this.inputManager, this.bulletPool, this.particlePool);

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
    this.world.addSystem(new AsteroidRenderSystem());

    this.initializeEntities();
  }

  private initializeEntities(): void {
    createShip({ world: this.world, x: GAME_CONFIG.SCREEN_CENTER_X, y: GAME_CONFIG.SCREEN_CENTER_Y });
    createGameState({ world: this.world });
    spawnAsteroidWave({ world: this.world, count: GAME_CONFIG.INITIAL_ASTEROID_COUNT });
  }
}
