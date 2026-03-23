import { BaseGame } from "../../engine/BaseGame";
import { MovementSystem } from "../../engine/systems/generic/MovementSystem";
import { PhysicsSystem } from "../../engine/systems/generic/PhysicsSystem";
import { AnimationSystem } from "../../engine/systems/generic/AnimationSystem";
import { CollisionSystem } from "../../engine/systems/generic/CollisionSystem";
import { TTLSystem } from "../../engine/systems/generic/TTLSystem";
import { AsteroidsCollisionResolver } from "./systems/AsteroidsCollisionResolver";
import { InputSystem } from "./systems/InputSystem";
import { GameStateSystem } from "./systems/GameStateSystem";
import { RenderSystem } from "./systems/RenderSystem";
import { createShip, spawnAsteroidWave, createGameState } from "./EntityFactory";
import { GAME_CONFIG, GameStateComponent, INITIAL_GAME_STATE } from "../../types/GameTypes";
import { getGameState } from "./GameUtils";
import { KeyboardController, TouchController } from "../../engine/input/InputController";

export class AsteroidsGame extends BaseGame {
  private gameStateSystem!: GameStateSystem;
  private renderSystem!: RenderSystem;
  private globalKeyDownListener = (e: KeyboardEvent) => this.handleGlobalKeyDown(e);

  constructor() {
    super();
    this.inputManager.addController(new KeyboardController());
    this.inputManager.addController(new TouchController());
    this.registerSystems();
    this.initializeEntities();
    this.registerGlobalKeyboardListeners();
  }

  protected registerSystems(): void {
    this.gameStateSystem = new GameStateSystem(this as any);
    this.renderSystem = new RenderSystem();

    this.world.addSystem(new InputSystem(this.inputManager));
    this.world.addSystem(new AnimationSystem());
    this.world.addSystem(new PhysicsSystem({ friction: GAME_CONFIG.SHIP_FRICTION }));
    this.world.addSystem(new MovementSystem({
      wrap: true,
      bounds: { width: GAME_CONFIG.SCREEN_WIDTH, height: GAME_CONFIG.SCREEN_HEIGHT }
    }));
    this.world.addSystem(new CollisionSystem(this.eventBus));
    this.world.addSystem(new AsteroidsCollisionResolver(this.eventBus));
    this.world.addSystem(new TTLSystem());
    this.world.addSystem(this.gameStateSystem);
    this.world.addSystem(this.renderSystem);
  }

  protected initializeEntities(): void {
    createShip({ world: this.world, x: GAME_CONFIG.SCREEN_CENTER_X, y: GAME_CONFIG.SCREEN_CENTER_Y });
    createGameState({ world: this.world });
    spawnAsteroidWave({ world: this.world, count: GAME_CONFIG.INITIAL_ASTEROID_COUNT });
  }

  public getGameState(): GameStateComponent {
    return getGameState(this.world);
  }

  public isGameOver(): boolean {
    return this.gameStateSystem.isGameOver();
  }

  public getRenderSystem(): RenderSystem {
    return this.renderSystem;
  }

  public destroy(): void {
    super.destroy();
    this.unregisterGlobalKeyboardListeners();
  }

  private registerGlobalKeyboardListeners(): void {
    if (typeof window !== "undefined" && window.addEventListener) {
      window.addEventListener("keydown", this.globalKeyDownListener);
    }
  }

  private unregisterGlobalKeyboardListeners(): void {
    if (typeof window !== "undefined" && window.removeEventListener) {
      window.removeEventListener("keydown", this.globalKeyDownListener);
    }
  }

  private handleGlobalKeyDown(e: KeyboardEvent): void {
    if (e.code === GAME_CONFIG.KEYS.PAUSE) {
      this.isPausedState() ? this.resume() : this.pause();
    } else if (e.code === GAME_CONFIG.KEYS.RESTART) {
      this.restart();
    }
  }
}

/**
 * Null Object implementation for safe usage in React.
 */
export class NullAsteroidsGame extends AsteroidsGame {
  constructor() {
    super();
    this.stop();
  }
  public getGameState(): GameStateComponent { return INITIAL_GAME_STATE; }
}
