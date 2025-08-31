import { World } from "./ecs-world"
import { MovementSystem } from "./systems/MovementSystem"
import { InputSystem } from "./systems/InputSystem"
import { CollisionSystem } from "./systems/CollisionSystem"
import { TTLSystem } from "./systems/TTLSystem"
import { GameStateSystem } from "./systems/GameStateSystem"
import { createShip, createAsteroid } from "./EntityFactory"
import type { GameStateComponent } from "../types/GameTypes"

export class AsteroidsGame {
  private world: World
  private inputSystem: InputSystem
  private gameStateSystem: GameStateSystem
  private lastTime = 0
  private isRunning = false
  private isPaused = false  // Nuevo flag de pausa
  private gameLoopId: number | null = null

  constructor() {
    this.world = new World()
    this.setupSystems()
    this.initializeGame()
  }

  private setupSystems(): void {
    this.inputSystem = new InputSystem()
    this.gameStateSystem = new GameStateSystem(this) // Pasar referencia de this
    this.world.addSystem(this.inputSystem)
    this.world.addSystem(new MovementSystem())
    this.world.addSystem(new CollisionSystem())
    this.world.addSystem(new TTLSystem())
    this.world.addSystem(this.gameStateSystem)
  }

  private initializeGame(): void {
    // Create player ship
    createShip(this.world, 400, 300)

    // Create game state
    const gameState = this.world.createEntity()
    this.world.addComponent(gameState, {
      type: "GameState",
      lives: 3,
      score: 0,
      level: 1,
      asteroidsRemaining: 0,
    })

    // Spawn initial asteroids
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI * 2 * i) / 4
      const x = 400 + Math.cos(angle) * 150
      const y = 300 + Math.sin(angle) * 150
      createAsteroid(this.world, x, y, "large")
    }
  }

  start(): void {
    this.isRunning = true
    this.isPaused = false
    this.lastTime = performance.now()
    this.gameLoop()
  }

  stop(): void {
    this.isRunning = false
    this.isPaused = false
    if (this.gameLoopId) {
      cancelAnimationFrame(this.gameLoopId)
    }
  }

  // Nuevo método: pausar juego
  pause(): void {
    this.isPaused = true
    console.log("Game Paused")
  }

  // Nuevo método: reanudar juego
  resume(): void {
    if (this.isPaused && this.isRunning) {
      this.isPaused = false
      this.lastTime = performance.now() // Reset tiempo para evitar deltaTime gigante
      console.log("Game Resumed")
    }
  }

  // Nuevo método: reiniciar juego después de Game Over
  restart(): void {
    // Limpiar mundo actual
    const allEntities = this.world.getAllEntities()
    allEntities.forEach(entity => this.world.removeEntity(entity))

    // Reset flags de sistemas
    this.gameStateSystem.resetGameOverState()

    // Re-inicializar juego
    this.initializeGame()
    
    // Reiniciar game loop si estaba pausado
    if (this.isPaused) {
      this.start()
    }
    
    console.log("Game Restarted")
  }

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

  // Getter para estado de pausa
  getIsPaused(): boolean {
    return this.isPaused
  }

  // Getter para estado de game over
  getIsGameOver(): boolean {
    return this.gameStateSystem.isGameOver()
  }

  getWorld(): World {
    return this.world
  }

  getGameState(): GameStateComponent | null {
    const gameStates = this.world.query("GameState")
    if (gameStates.length > 0) {
      return this.world.getComponent<GameStateComponent>(gameStates[0], "GameState") || null
    }
    return null
  }

  // Mobile control methods
  setInput(thrust: boolean, rotateLeft: boolean, rotateRight: boolean, shoot: boolean): void {
    // Solo procesar input si no está pausado o en game over
    if (!this.isPaused && !this.getIsGameOver()) {
      this.inputSystem.setInput(thrust, rotateLeft, rotateRight, shoot)
    }
  }
}