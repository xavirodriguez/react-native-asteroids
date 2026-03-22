import { World } from "./ecs-world"
import { MovementSystem } from "./systems/MovementSystem"
import { InputSystem } from "./systems/InputSystem"
import { CollisionSystem } from "./systems/CollisionSystem"
import { TTLSystem } from "./systems/TTLSystem"
import { RenderSystem } from "./systems/RenderSystem"
import { createShip, spawnAsteroidWave, createGameState } from "./EntityFactory"
import {
  type GameStateComponent,
  type InputState,
  GAME_CONFIG,
} from "../types/GameTypes"
import { getGameState } from "./GameUtils"
import { INITIAL_GAME_STATE } from "../types/GameTypes"
import { type IAsteroidsGame, type UpdateListener, type IGameStateSystem } from "./types/GameInterfaces"
import { GameStateSystem } from "./systems/GameStateSystem"
import { InputManager } from "../engine/input/InputManager"
import { KeyboardController, TouchController } from "../engine/input/InputController"

/**
 * Main controller for the Asteroids game.
 * Manages the game loop, systems initialization, and high-level game state transitions.
 */
/**
 * Null Object implementation of the Asteroids game.
 * Used to avoid null checks in React components and hooks.
 */
export class NullAsteroidsGame implements IAsteroidsGame {
  private world = new World()
  private renderSystem = new RenderSystem()

  public pause(): void {}
  public resume(): void {}
  public restart(): void {}
  public getWorld(): World {
    return this.world
  }
  public isPausedState(): boolean {
    return false
  }
  public isGameOver(): boolean {
    return false
  }
  public getGameState(): GameStateComponent {
    return INITIAL_GAME_STATE
  }
  public setInput(input: Partial<InputState>): void {
    void input
  }
  public subscribe(listener: UpdateListener): () => void {
    void listener
    return () => {}
  }
  public destroy(): void {}
  public getRenderSystem(): RenderSystem {
    return this.renderSystem
  }
}

export class AsteroidsGame implements IAsteroidsGame {
  private world: World;
  private inputSystem!: InputSystem;
  private inputManager!: InputManager;
  private gameStateSystem!: IGameStateSystem;
  private renderSystem!: RenderSystem;
  private loopState = {
    isRunning: false,
    isPaused: false,
    lastTime: 0,
    gameLoopId: undefined as number | undefined,
  };
  private listeners = new Set<UpdateListener>();
  private globalKeyDownListener = (e: KeyboardEvent) => this.handleGlobalKeyDown(e);

  constructor() {
    this.world = new World();
    this.setupSystems();
    this.initializeGame();
    this.registerGlobalKeyboardListeners();
  }

  // --- Public Methods ---

  public start(): void {
    if (this.loopState.isRunning) return

    const now = performance.now();
    this.loopState.isRunning = true;
    this.loopState.isPaused = false;
    this.loopState.lastTime = now;
    this.gameLoop();
  }

  public stop(): void {
    if (this.loopState.gameLoopId) {
      cancelAnimationFrame(this.loopState.gameLoopId);
      this.loopState.gameLoopId = undefined;
    }
    this.loopState.isRunning = false;
    this.loopState.isPaused = false;
  }

  public pause(): void {
    if (this.loopState.isRunning && !this.loopState.isPaused) {
      this.loopState.isPaused = true;
      this.notifyStatusChange("PAUSED");
    }
  }

  public resume(): void {
    const canResume = this.loopState.isPaused && this.loopState.isRunning;
    if (canResume) {
      this.loopState.isPaused = false;
      this.loopState.lastTime = performance.now();
      this.notifyStatusChange("RESUMED");
    }
  }

  public restart(): void {
    this.resetGameState();
    this.initializeGame();
    this.resumeIfPaused();
    this.notifyStatusChange("RESTARTED");
  }

  public isPausedState(): boolean {
    return this.loopState.isPaused
  }

  public isGameOver(): boolean {
    return this.gameStateSystem.isGameOver()
  }

  public getGameState(): GameStateComponent {
    return getGameState(this.world)
  }

  public setInput(input: Partial<InputState>): void {
    const canProcessInput = !this.loopState.isPaused && !this.isGameOver();
    if (canProcessInput) {
      this.inputSystem.setInput(input);
    }
  }

  public getWorld(): World {
    return this.world;
  }

  public getRenderSystem(): RenderSystem {
    return this.renderSystem;
  }

  public subscribe(listener: UpdateListener): () => void {
    this.listeners.add(listener);
    const unsubscribe = () => {
      this.listeners.delete(listener);
    };
    return unsubscribe;
  }

  public destroy(): void {
    this.stop();
    this.inputManager.cleanup();
    this.unregisterGlobalKeyboardListeners();
    this.listeners.clear();
  }

  // --- Private Methods ---

  private resetGameState(): void {
    this.world.clear();
    this.gameStateSystem.resetGameOverState();
  }

  private resumeIfPaused(): void {
    if (this.loopState.isPaused) {
      this.start();
    }
  }

  private notifyStatusChange(status: string): void {
    void status;
    this.notifyListeners();
  }

  private setupSystems(): void {
    this.createSystems();
    this.registerSystems();
  }

  private createSystems(): void {
    this.inputManager = new InputManager();
    this.inputManager.addController(new KeyboardController());
    this.inputManager.addController(new TouchController());

    this.inputSystem = new InputSystem(this.inputManager);
    this.gameStateSystem = new GameStateSystem(this);
    this.renderSystem = new RenderSystem();
  }

  private registerSystems(): void {
    this.world.addSystem(this.inputSystem);
    this.world.addSystem(new MovementSystem());
    this.world.addSystem(new CollisionSystem());
    this.world.addSystem(new TTLSystem());
    this.world.addSystem(this.gameStateSystem);
    this.world.addSystem(this.renderSystem);
  }

  private initializeGame(): void {
    this.setupShip();
    this.setupGameState();
    this.setupAsteroids();
  }

  private setupAsteroids(): void {
    spawnAsteroidWave({ world: this.world, count: GAME_CONFIG.INITIAL_ASTEROID_COUNT });
  }

  private setupShip(): void {
    const x = GAME_CONFIG.SCREEN_CENTER_X;
    const y = GAME_CONFIG.SCREEN_CENTER_Y;
    createShip({ world: this.world, x, y });
  }

  private setupGameState(): void {
    createGameState({ world: this.world })
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      listener(this);
    });
  }

  private gameLoop = (): void => {
    if (!this.loopState.isRunning) return;

    const deltaTime = this.calculateDeltaTime();
    this.updateAndNotify(deltaTime);

    this.loopState.gameLoopId = requestAnimationFrame(this.gameLoop);
  }

  private calculateDeltaTime(): number {
    const currentTime = performance.now();
    const rawDeltaTime = currentTime - this.loopState.lastTime;
    this.loopState.lastTime = currentTime;

    return Math.min(rawDeltaTime, GAME_CONFIG.MAX_DELTA_TIME);
  }

  private updateAndNotify(deltaTime: number): void {
    this.updateWorld(deltaTime);
    this.notifyListeners();
  }

  private updateWorld(deltaTime: number): void {
    if (!this.loopState.isPaused) {
      this.world.update(deltaTime);
    }
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
    if (this.loopState.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }
}
