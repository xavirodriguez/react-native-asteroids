import { World } from "../../engine/core/World";
import { GameLoop } from "../../engine/core/GameLoop";
import { MovementSystem } from "../../engine/systems/MovementSystem";
import { TTLSystem } from "../../engine/systems/TTLSystem";
import { AsteroidCollisionSystem } from "./systems/AsteroidCollisionSystem";
import { AsteroidGameStateSystem } from "./systems/AsteroidGameStateSystem";
import { AsteroidRenderSystem } from "./systems/AsteroidRenderSystem";
import { AsteroidInputSystem } from "./systems/AsteroidInputSystem";
import { createShip, spawnAsteroidWave, createGameState } from "./EntityFactory";
import { GAME_CONFIG, type InputState, type GameStateComponent, INITIAL_GAME_STATE } from "../../types/GameTypes";
import { InputManager } from "../../engine/input/InputManager";
import { KeyboardController, TouchController } from "../../engine/input/InputController";
import { type IAsteroidsGame, type UpdateListener } from "./types/GameInterfaces";
import { getGameState } from "./GameUtils";

/**
 * Null Object implementation of the Asteroids game.
 * Used to avoid null checks in React components and hooks.
 */
export class NullAsteroidsGame implements IAsteroidsGame {
  private world = new World();
  private renderSystem = new AsteroidRenderSystem();

  public pause(): void {}
  public resume(): void {}
  public restart(): void {}
  public getWorld(): World {
    return this.world;
  }
  public isPausedState(): boolean {
    return false;
  }
  public isGameOver(): boolean {
    return false;
  }
  public getGameState(): GameStateComponent {
    return INITIAL_GAME_STATE;
  }
  public setInput(input: Partial<InputState>): void {
    void input;
  }
  public subscribe(listener: UpdateListener): () => void {
    void listener;
    return () => {};
  }
  public destroy(): void {}
  public getRenderSystem(): AsteroidRenderSystem {
    return this.renderSystem;
  }
}

/**
 * Main controller for the Asteroids game using the TinyAsterEngine.
 */
export class AsteroidsGame implements IAsteroidsGame {
  private world: World;
  private gameLoop: GameLoop;
  private inputManager: InputManager;
  private inputSystem: AsteroidInputSystem;
  private renderSystem: AsteroidRenderSystem;
  private gameStateSystem: AsteroidGameStateSystem;
  private listeners = new Set<UpdateListener>();
  private isPaused = false;
  private globalKeyDownListener = (e: KeyboardEvent) => this.handleGlobalKeyDown(e);

  constructor() {
    this.world = new World();
    this.gameLoop = new GameLoop(this.world);
    this.inputManager = new InputManager();
    this.inputManager.addController(new KeyboardController());
    this.inputManager.addController(new TouchController());

    this.inputSystem = new AsteroidInputSystem(this.inputManager);
    this.renderSystem = new AsteroidRenderSystem();
    this.gameStateSystem = new AsteroidGameStateSystem(this);

    this.setupSystems();
    this.initializeGame();

    this.gameLoop.subscribeUpdate(() => {
        if (!this.isPaused) {
            this.notifyListeners();
        }
    });

    this.registerGlobalKeyboardListeners();
  }

  public start(): void {
    this.gameLoop.start();
  }

  public stop(): void {
    this.gameLoop.stop();
  }

  public pause(): void {
    this.isPaused = true;
    this.notifyListeners();
  }

  public resume(): void {
    this.isPaused = false;
    this.notifyListeners();
  }

  public restart(): void {
    this.world.clear();
    this.gameStateSystem.resetGameOverState();
    this.initializeGame();
    this.resume();
  }

  public getWorld(): World {
    return this.world;
  }

  public isPausedState(): boolean {
    return this.isPaused;
  }

  public isGameOver(): boolean {
    return this.gameStateSystem.isGameOver();
  }

  public getGameState(): GameStateComponent {
    return getGameState(this.world);
  }

  public setInput(input: Partial<InputState>): void {
    if (!this.isPaused && !this.isGameOver()) {
        this.inputManager.setInputs(input);
    }
  }

  public subscribe(listener: UpdateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public destroy(): void {
    this.stop();
    this.inputManager.cleanup();
    this.unregisterGlobalKeyboardListeners();
    this.listeners.clear();
  }

  public getRenderSystem(): AsteroidRenderSystem {
    return this.renderSystem;
  }

  private setupSystems(): void {
    this.world.addSystem(this.inputSystem);
    this.world.addSystem(new MovementSystem(GAME_CONFIG.SCREEN_WIDTH, GAME_CONFIG.SCREEN_HEIGHT));
    this.world.addSystem(new AsteroidCollisionSystem());
    this.world.addSystem(new TTLSystem());
    this.world.addSystem(this.gameStateSystem);
    this.world.addSystem(this.renderSystem);
  }

  private initializeGame(): void {
    createShip({ world: this.world, x: GAME_CONFIG.SCREEN_CENTER_X, y: GAME_CONFIG.SCREEN_CENTER_Y });
    createGameState({ world: this.world });
    spawnAsteroidWave({ world: this.world, count: GAME_CONFIG.INITIAL_ASTEROID_COUNT });
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l(this));
  }

  private registerGlobalKeyboardListeners(): void {
    const isBrowser = typeof window !== "undefined" && typeof window.addEventListener === "function";
    if (!isBrowser) return;

    window.addEventListener("keydown", this.globalKeyDownListener);
  }

  private unregisterGlobalKeyboardListeners(): void {
    const isBrowser = typeof window !== "undefined" && typeof window.removeEventListener === "function";
    if (!isBrowser) return;

    window.removeEventListener("keydown", this.globalKeyDownListener);
  }

  private handleGlobalKeyDown(e: KeyboardEvent): void {
    const actionMap: Record<string, () => void> = {
      [GAME_CONFIG.KEYS.PAUSE]: () => this.togglePause(),
      [GAME_CONFIG.KEYS.RESTART]: () => this.restart(),
    };

    const action = actionMap[e.code];
    if (action) {
      action();
    }
  }

  private togglePause(): void {
    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }
}
