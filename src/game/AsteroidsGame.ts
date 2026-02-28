import { World } from "./ecs-world"
import { MovementSystem } from "./systems/MovementSystem"
import { InputSystem } from "./systems/InputSystem"
import { CollisionSystem } from "./systems/CollisionSystem"
import { TTLSystem } from "./systems/TTLSystem"
import { GameStateSystem } from "./systems/GameStateSystem"
import { createShip, createAsteroid } from "./EntityFactory"
import {
  type GameStateComponent,
  type InputState,
  GAME_CONFIG,
  INITIAL_GAME_STATE,
} from "../types/GameTypes"

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
  getIsPaused(): boolean;
  getIsGameOver(): boolean;
  getGameState(): GameStateComponent;
  subscribe(listener: UpdateListener): () => void;
}

/**
 * Main controller for the Asteroids game.
 * Manages the game loop, systems initialization, and high-level game state transitions.
 *
 * @remarks
 * This class follows the controller pattern, orchestrating the ECS world and its systems.
 */
export class AsteroidsGame implements IAsteroidsGame {
  private world: World;
  private inputSystem!: InputSystem;
  private gameStateSystem!: GameStateSystem;
  private lastTime = 0;
  private isRunning = false;
  private isPaused = false;
  private gameLoopId: number | undefined = undefined;
  private listeners = new Set<UpdateListener>();

  constructor() {
    this.world = new World();
    this.setupSystems();
    this.initializeGame();
  }

  // --- Public Methods ---

  /**
   * Starts the game loop.
   */
  public start(): void {
    const now = performance.now();
    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = now;
    this.gameLoop();
  }

  /**
   * Stops the game loop and cancels any pending frames.
   */
  public stop(): void {
    if (this.gameLoopId) {
      cancelAnimationFrame(this.gameLoopId);
      this.gameLoopId = undefined;
    }
    this.isRunning = false;
    this.isPaused = false;
  }

  /**
   * Pauses the game execution.
   */
  public pause(): void {
    if (this.isRunning && !this.isPaused) {
      this.isPaused = true;
      this.notifyListeners();
    }
  }

  /**
   * Resumes the game execution from a paused state.
   */
  public resume(): void {
    if (this.isPaused && this.isRunning) {
      this.isPaused = false;
      this.lastTime = performance.now();
      this.notifyListeners();
    }
  }

  /**
   * Resets the game to its initial state.
   */
  public restart(): void {
    this.world.clear();
    this.gameStateSystem.resetGameOverState();
    this.initializeGame();

    if (this.isPaused) {
      this.start();
    }

    this.notifyListeners();
  }

  /**
   * Subscribes a listener to game updates.
   *
   * @param listener - Callback function called on every frame.
   * @returns Unsubscribe function.
   */
  public subscribe(listener: UpdateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  public getIsGameOver(): boolean {
    return this.gameStateSystem.isGameOver();
  }

  public getWorld(): World {
    return this.world;
  }

  /**
   * Retrieves the current global game state component.
   *
   * @returns The GameStateComponent or INITIAL_GAME_STATE if not found.
   */
  public getGameState(): GameStateComponent {
    const entities = this.world.query("GameState");
    if (entities.length === 0) {
      return INITIAL_GAME_STATE;
    }

    const gameState = this.world.getComponent<GameStateComponent>(entities[0], "GameState");
    return gameState || INITIAL_GAME_STATE;
  }

  /**
   * Updates the input state processed by the InputSystem.
   *
   * @param input - Partial input state to update.
   */
  public setInput(input: Partial<InputState>): void {
    const canProcessInput = !this.isPaused && !this.getIsGameOver();
    if (canProcessInput) {
      this.inputSystem.setInput(input);
    }
  }

  // --- Private Methods ---

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
    this.spawnInitialAsteroids(GAME_CONFIG.INITIAL_ASTEROID_COUNT);
  }

  private setupShip(): void {
    const x = GAME_CONFIG.SCREEN_CENTER_X;
    const y = GAME_CONFIG.SCREEN_CENTER_Y;
    createShip({ world: this.world, x, y });
  }

  private setupGameState(): void {
    const gameStateEntity = this.world.createEntity();
    this.world.addComponent(gameStateEntity, {
      type: "GameState",
      lives: GAME_CONFIG.SHIP_INITIAL_LIVES,
      score: 0,
      level: 1,
      asteroidsRemaining: 0,
      isGameOver: false,
    });
  }

  private spawnInitialAsteroids(total: number): void {
    const x = GAME_CONFIG.SCREEN_CENTER_X;
    const y = GAME_CONFIG.SCREEN_CENTER_Y;
    const radius = GAME_CONFIG.INITIAL_ASTEROID_SPAWN_RADIUS;

    for (let i = 0; i < total; i++) {
      this.spawnAsteroidAtAngle(i, total, x, y, radius);
    }
  }

  private spawnAsteroidAtAngle(index: number, total: number, centerX: number, centerY: number, radius: number): void {
    const angle = (Math.PI * 2 * index) / total;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    createAsteroid({ world: this.world, x, y, size: "large" });
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      listener(this);
    });
  }

  private gameLoop = (): void => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.updateWorld(deltaTime);
    this.notifyListeners();
    this.gameLoopId = requestAnimationFrame(this.gameLoop);
  }

  private updateWorld(deltaTime: number): void {
    if (!this.isPaused) {
      this.world.update(deltaTime);
    }
  }
}
