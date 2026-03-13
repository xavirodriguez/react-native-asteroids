import { World } from "./ecs-world"
import { MovementSystem } from "./systems/MovementSystem"
import { InputSystem } from "./systems/InputSystem"
import { CollisionSystem } from "./systems/CollisionSystem"
import { TTLSystem } from "./systems/TTLSystem"
import { GameStateSystem } from "./systems/GameStateSystem"
import { createShip, spawnAsteroidWave, createGameState } from "./EntityFactory"
import {
  type GameStateComponent,
  type InputState,
  GAME_CONFIG,
} from "../types/GameTypes"
import { getGameState } from "./GameUtils"
import { INITIAL_GAME_STATE } from "../types/GameTypes"

/**
 * Type definition for a callback function triggered on every game update.
 */
export type UpdateListener = (game: IAsteroidsGame) => void;

/**
 * Interface defining the public API for the Asteroids game controller.
 */
export interface IAsteroidsGame {
  pause(): void;
  resume(): void;
  restart(): void;
  getWorld(): World;
  isPausedState(): boolean;
  isGameOver(): boolean;
  getGameState(): GameStateComponent;
  setInput(input: Partial<InputState>): void;
  subscribe(listener: UpdateListener): () => void;
  destroy(): void;
}

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
}

export class AsteroidsGame implements IAsteroidsGame {
  private world: World;
  private inputSystem!: InputSystem;
  private gameStateSystem!: GameStateSystem;
  private lastTime = 0;
  private isRunning = false;
  private isPaused = false;
  private gameLoopId: number | undefined = undefined;
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
    if (this.isRunning) return

    const now = performance.now();
    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = now;
    this.gameLoop();
  }

  public stop(): void {
    if (this.gameLoopId) {
      cancelAnimationFrame(this.gameLoopId);
      this.gameLoopId = undefined;
    }
    this.isRunning = false;
    this.isPaused = false;
  }

  public pause(): void {
    if (this.isRunning && !this.isPaused) {
      this.isPaused = true;
      this.notifyStatusChange("PAUSED");
    }
  }

  public resume(): void {
    const canResume = this.isPaused && this.isRunning;
    if (canResume) {
      this.isPaused = false;
      this.lastTime = performance.now();
      this.notifyStatusChange("RESUMED");
    }
  }

  public restart(): void {
    this.resetGameState();
    this.initializeGame();
    this.resumeIfPaused();
    this.notifyStatusChange("RESTARTED");
  }

  public subscribe(listener: UpdateListener): () => void {
    this.listeners.add(listener);
    const unsubscribe = () => {
      this.listeners.delete(listener);
    };
    return unsubscribe;
  }

  public isPausedState(): boolean {
    return this.isPaused
  }

  public isGameOver(): boolean {
    return this.gameStateSystem.isGameOver()
  }

  public getWorld(): World {
    return this.world;
  }

  public destroy(): void {
    this.stop();
    this.inputSystem.cleanup();
    this.unregisterGlobalKeyboardListeners();
    this.listeners.clear();
  }

  public getGameState(): GameStateComponent {
    return getGameState(this.world)
  }

  public setInput(input: Partial<InputState>): void {
    const canProcessInput = !this.isPaused && !this.isGameOver();
    if (canProcessInput) {
      this.inputSystem.setInput(input);
    }
  }

  // --- Private Methods ---

  private resetGameState(): void {
    this.world.clear();
    this.gameStateSystem.resetGameOverState();
  }

  private resumeIfPaused(): void {
    if (this.isPaused) {
      this.start();
    }
  }

  private notifyStatusChange(status: string): void {
    console.log(`Game state changed: ${status}`);
    this.notifyListeners();
  }

  private setupSystems(): void {
    this.inputSystem = new InputSystem();
    this.gameStateSystem = new GameStateSystem(this);

    this.world.addSystem(this.inputSystem);
    this.world.addSystem(new MovementSystem());
    this.world.addSystem(new CollisionSystem());
    this.world.addSystem(new TTLSystem());
    this.world.addSystem(this.gameStateSystem);
  }

  private initializeGame(): void {
    this.setupShip();
    this.setupGameState();
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
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const rawDeltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Cap deltaTime at 100ms (0.1s) to prevent physics explosions after long pauses
    const deltaTime = Math.min(rawDeltaTime, 100);

    this.updateWorld(deltaTime);
    this.notifyListeners();
    this.gameLoopId = requestAnimationFrame(this.gameLoop);
  }

  private updateWorld(deltaTime: number): void {
    if (!this.isPaused) {
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
    if (e.code === GAME_CONFIG.KEYS.PAUSE) {
      this.togglePause();
    } else if (e.code === GAME_CONFIG.KEYS.RESTART) {
      this.restart();
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
