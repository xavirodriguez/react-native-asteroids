import { World } from "./ecs-world"
import { MovementSystem } from "./systems/MovementSystem"
import { InputSystem } from "./systems/InputSystem"
import { CollisionSystem } from "./systems/CollisionSystem"
import { TTLSystem } from "./systems/TTLSystem"
import { GameStateSystem } from "./systems/GameStateSystem"
import { createShip, createAsteroid } from "./EntityFactory"
import type { GameStateComponent } from "../types/GameTypes"

/**
 * Main controller for the Asteroids game.
 * Manages the game loop, systems initialization, and high-level game state transitions.
 *
 * @remarks
 * This class orchestrates the interaction between the ECS {@link World} and the browser's
 * animation frames. It handles pausing, resuming, and restarting the game.
 */
export class AsteroidsGame {
  /** The ECS world instance containing all game entities and systems. */
  private world: World

  /**
   * System responsible for handling user input.
   * Initialized in {@link setupSystems}.
   */
  private inputSystem!: InputSystem;

  /**
   * System responsible for global game state (score, lives, levels).
   * Initialized in {@link setupSystems}.
   */
  private gameStateSystem!: GameStateSystem

  /** Timestamp of the last frame in milliseconds. */
  private lastTime = 0

  /** Flag indicating if the game is currently running. */
  private isRunning = false

  /** Flag indicating if the game logic is paused. */
  private isPaused = false

  /** ID of the current requestAnimationFrame, used for stopping the loop. */
  private gameLoopId: number | null = null

  /**
   * Creates a new Asteroids game instance.
   * Initializes the ECS world, systems, and starting entities.
   */
  constructor() {
    this.world = new World()
    this.setupSystems()
    this.initializeGame()
  }

  /**
   * Initializes and registers all game systems in the ECS world.
   *
   * @remarks
   * Systems are added in a specific order that affects their execution sequence within a frame.
   * Some systems, like {@link GameStateSystem}, receive a reference to this game instance
   * to allow them to trigger high-level actions like pausing on game over.
   */
  private setupSystems(): void {
    this.inputSystem = new InputSystem()
    this.gameStateSystem = new GameStateSystem(this)
    this.world.addSystem(this.inputSystem)
    this.world.addSystem(new MovementSystem())
    this.world.addSystem(new CollisionSystem())
    this.world.addSystem(new TTLSystem())
    this.world.addSystem(this.gameStateSystem)
  }

  /**
   * Resets the world and creates initial entities (player ship, game state, initial asteroids).
   */
  private initializeGame(): void {
    createShip(this.world, 400, 300)
    const gameState = this.world.createEntity()
    this.world.addComponent(gameState, {
      type: "GameState",
      lives: 3,
      score: 0,
      level: 1,
      asteroidsRemaining: 0,
    })

    // Spawn initial asteroids
    this.spawnInitialAsteroids(4);
  }

  /**
   * Spawns a set of initial asteroids around the center of the screen.
   *
   * @param total - Number of asteroids to spawn.
   */
  private spawnInitialAsteroids(total:number): void {
    for (let i = 0; i < total; i++) {
      const angle = (Math.PI * 2 * i) / 4
      const x = 400 + Math.cos(angle) * 150
      const y = 300 + Math.sin(angle) * 150
      createAsteroid(this.world, x, y, "large")
    }
  }

  /**
   * Starts or resumes the game loop.
   */
  start(): void {
    this.isRunning = true
    this.isPaused = false
    this.lastTime = performance.now()
    this.gameLoop()
  }

  /**
   * Stops the game loop and cancels any pending animation frames.
   */
  stop(): void {
    this.isRunning = false
    this.isPaused = false
    if (this.gameLoopId) {
      cancelAnimationFrame(this.gameLoopId)
    }
  }

  /**
   * Pauses the game logic execution while keeping the loop running.
   */
  pause(): void {
    this.isPaused = true
    console.log("Game Paused")
  }

  /**
   * Resumes the game logic execution.
   *
   * @remarks
   * Resets the `lastTime` to the current time to prevent a large `deltaTime` spike
   * after being paused for a long duration.
   */
  resume(): void {
    if (this.isPaused && this.isRunning) {
      this.isPaused = false
      this.lastTime = performance.now()
      console.log("Game Resumed")
    }
  }

  /**
   * Resets the game to its initial state.
   * Clears all entities and re-initializes the game world.
   */
  restart(): void {
    const allEntities = this.world.getAllEntities()
    allEntities.forEach(entity => this.world.removeEntity(entity))
    this.gameStateSystem.resetGameOverState()
    this.initializeGame()
    
    // Reiniciar game loop si estaba pausado
    if (this.isPaused) {
      this.start()
    }
    
    console.log("Game Restarted")
  }

  /**
   * The core game loop executed on every animation frame.
   * Calculates deltaTime and updates the ECS world if the game is not paused.
   */
  private gameLoop = (): void => {
    if (!this.isRunning) return

    const currentTime = performance.now()
    const deltaTime = currentTime - this.lastTime
    this.lastTime = currentTime

    // Solo actualizar sistemas si no está pausado
    if (!this.isPaused) {
      this.world.update(deltaTime)
    }

    this.gameLoopId = requestAnimationFrame(this.gameLoop)
  }

  /**
   * Checks if the game is currently paused.
   *
   * @returns `true` if paused, `false` otherwise.
   */
  getIsPaused(): boolean {
    return this.isPaused
  }

  /**
   * Checks if the game is in a game over state.
   *
   * @returns `true` if game over, `false` otherwise.
   */
  getIsGameOver(): boolean {
    return this.gameStateSystem.isGameOver()
  }

  /**
   * Returns the ECS world instance.
   *
   * @returns The {@link World} instance.
   */
  getWorld(): World {
    return this.world
  }

  /**
   * Retrieves the current game state component.
   *
   * @returns The {@link GameStateComponent} if it exists, otherwise `null`.
   */
  getGameState(): GameStateComponent | null {
    const gameStates = this.world.query("GameState")
    if (gameStates.length > 0) {
      return this.world.getComponent<GameStateComponent>(gameStates[0], "GameState") || null
    }
    return null
  }

  /**
   * Manually sets the input state, typically used for mobile or external controls.
   *
   * @param thrust - Whether thrust is active.
   * @param rotateLeft - Whether rotating left is active.
   * @param rotateRight - Whether rotating right is active.
   * @param shoot - Whether shooting is active.
   */
  setInput(thrust: boolean, rotateLeft: boolean, rotateRight: boolean, shoot: boolean): void {
    // Solo procesar input si no está pausado o en game over
    if (!this.isPaused && !this.getIsGameOver()) {
      this.inputSystem.setInput(thrust, rotateLeft, rotateRight, shoot)
    }
  }
}
