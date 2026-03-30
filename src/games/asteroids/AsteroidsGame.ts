import { World } from "../../engine/core/World";
import { BaseGame } from "../../engine/core/BaseGame";
import { AssetLoader } from "../../engine/assets/AssetLoader";
import { AsteroidGameStateSystem } from "./systems/AsteroidGameStateSystem";
import { AsteroidRenderSystem } from "./systems/AsteroidRenderSystem";
import { AsteroidInputSystem } from "./systems/AsteroidInputSystem";
import { UfoSystem } from "./systems/UfoSystem";
import { RenderUpdateSystem } from "../../engine/systems/RenderUpdateSystem";
import { MovementSystem } from "../../engine/systems/MovementSystem";
import { WrapSystem } from "../../engine/systems/WrapSystem";
import { AsteroidCollisionSystem } from "./systems/AsteroidCollisionSystem";
import { TTLSystem } from "../../engine/systems/TTLSystem";
import { createShip, spawnAsteroidWave, createGameState } from "./EntityFactory";
import { GAME_CONFIG, type GameStateComponent, type InputState, INITIAL_GAME_STATE } from "./types/AsteroidTypes";
import { KeyboardController } from "../../engine/input/KeyboardController";
import { TouchController } from "../../engine/input/TouchController";
import { getGameState } from "./GameUtils";
import type { IAsteroidsGame } from "./types/GameInterfaces";
import { BulletPool, ParticlePool } from "./EntityPool";
import { Renderer } from "../../engine/rendering/Renderer";
import { drawAsteroidsShip, drawAsteroidsUfo, asteroidsStarfieldEffect, asteroidsCRTEffect, asteroidsScreenShakeEffect, drawAsteroidsBullet, drawAsteroidsParticle } from "./rendering/AsteroidsCanvasVisuals";
import { Platform } from "react-native";

/**
 * Main game controller for Asteroids.
 * Manages the ECS world, systems, and lifecycle.
 */
export class AsteroidsGame
  extends BaseGame<GameStateComponent, InputState>
  implements IAsteroidsGame {

  private gameStateSystem: AsteroidGameStateSystem;
  private assetLoader: AssetLoader;
  private bulletPool: BulletPool;
  private particlePool: ParticlePool;

  constructor() {
    super({ pauseKey: GAME_CONFIG.KEYS.PAUSE, restartKey: GAME_CONFIG.KEYS.RESTART });
  }

  protected registerSystems(): void {
    // Initialize pools here because super() calls this before the constructor finishes
    if (!this.bulletPool) this.bulletPool = new BulletPool();
    if (!this.particlePool) this.particlePool = new ParticlePool();
    if (!this.assetLoader) this.assetLoader = new AssetLoader();

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
    this.gameStateSystem = new AsteroidGameStateSystem(this);

    this.world.addSystem(inputSys);
    this.world.addSystem(new MovementSystem());
    this.world.addSystem(new WrapSystem(GAME_CONFIG.SCREEN_WIDTH, GAME_CONFIG.SCREEN_HEIGHT));
    this.world.addSystem(new AsteroidCollisionSystem(this.particlePool));
    this.world.addSystem(new TTLSystem());
    this.world.addSystem(this.gameStateSystem);
    this.world.addSystem(new UfoSystem());
    this.world.addSystem(new RenderUpdateSystem()); // Handle rotation/hit flash
    this.world.addSystem(new AsteroidRenderSystem()); // Handle trails/shake duration
  }

  protected initializeEntities(): void {}

  /**
   * Registers game-specific rendering logic to the provided renderer.
   */
  public initializeRenderer(renderer: Renderer): void {
    if (renderer.type === "canvas") {
      renderer.registerShape("triangle", drawAsteroidsShip);
      renderer.registerShape("ufo", drawAsteroidsUfo);
      renderer.registerShape("bullet_shape", drawAsteroidsBullet);
      renderer.registerShape("particle", drawAsteroidsParticle);
      renderer.registerBackgroundEffect("starfield", asteroidsStarfieldEffect);
      renderer.registerBackgroundEffect("screenshake", asteroidsScreenShakeEffect);
      renderer.registerForegroundEffect("crt", asteroidsCRTEffect);
    } else if (renderer.type === "skia" && Platform.OS !== "web") {
      try {
        const { drawSkiaShip, drawSkiaUfo, skiaStarfieldEffect, skiaScreenShakeEffect, drawSkiaBullet, drawSkiaParticle } = require("./rendering/AsteroidsSkiaVisuals");
        renderer.registerShape("triangle", drawSkiaShip);
        renderer.registerShape("ufo", drawSkiaUfo);
        renderer.registerShape("bullet_shape", drawSkiaBullet);
        renderer.registerShape("particle", drawSkiaParticle);
        renderer.registerBackgroundEffect("starfield", skiaStarfieldEffect);
        renderer.registerBackgroundEffect("screenshake", skiaScreenShakeEffect);
      } catch (e) {
        console.warn("Failed to load Skia visuals", e);
      }
    }
  }

  protected _onBeforeRestart(): void {
    this.gameStateSystem.resetGameOverState();
  }

  public getGameState(): GameStateComponent {
    return getGameState(this.getWorld());
  }

  public isGameOver(): boolean {
    return this.gameStateSystem.isGameOver();
  }
}

export class NullAsteroidsGame implements IAsteroidsGame {
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
