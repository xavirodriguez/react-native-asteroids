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
  setInput(input: Partial<InputState>): void;
}

/**
 * Main controller for the Asteroids game.
 * Manages the game loop, systems initialization, and high-level game state transitions.
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

  public start(): void {
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
      console.log("Game state changed: PAUSED");
      this.notifyListeners();
    }
  }

  public resume(): void {
    if (this.isPaused && this.isRunning) {
      this.isPaused = false;
      this.lastTime = performance.now();
      console.log("Game state changed: RESUMED");
      this.notifyListeners();
    }
  }

  public restart(): void {
    this.world.clear();
    this.gameStateSystem.resetGameOverState();
    this.initializeGame();
    
    if (this.isPaused) {
      this.start();
    }
    
    console.log("Game state changed: RESTARTED");
    this.notifyListeners();
  }

  public subscribe(listener: UpdateListener): () => void {
    this.listeners.add(listener);
    const unsubscribe = () => {
      this.listeners.delete(listener);
    };
    return unsubscribe;
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

  public getGameState(): GameStateComponent {
    const entities = this.world.query("GameState");
    if (entities.length === 0) {
      return INITIAL_GAME_STATE;
    }

    const gameState = this.world.getComponent<GameStateComponent>(entities[0], "GameState");
    return gameState || INITIAL_GAME_STATE;
  }

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
    const centerX = GAME_CONFIG.SCREEN_CENTER_X;
    const centerY = GAME_CONFIG.SCREEN_CENTER_Y;
    createShip(this.world, centerX, centerY);
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
    const centerX = GAME_CONFIG.SCREEN_CENTER_X;
    const centerY = GAME_CONFIG.SCREEN_CENTER_Y;
    const spawnRadius = GAME_CONFIG.INITIAL_ASTEROID_SPAWN_RADIUS;

    for (let i = 0; i < total; i++) {
      const angle = (Math.PI * 2 * i) / total;
      const x = centerX + Math.cos(angle) * spawnRadius;
      const y = centerY + Math.sin(angle) * spawnRadius;
      createAsteroid(this.world, x, y, "large");
    }
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

    if (!this.isPaused) {
      this.world.update(deltaTime);
    }

    this.notifyListeners();
    this.gameLoopId = requestAnimationFrame(this.gameLoop);
  }
}
