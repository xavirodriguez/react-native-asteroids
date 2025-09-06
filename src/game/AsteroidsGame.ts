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
  /*
  Usando el operador !: le digo TypeScript que confío en que la propiedad será inicializada
  antes de usarla, aunque no lo haga en el constructor
  */
  private inputSystem!: InputSystem;
  private gameStateSystem!: GameStateSystem
  private lastTime = 0
  private isRunning = false
  private isPaused = false
  private gameLoopId: number | null = null

  constructor() {
    this.world = new World()
    this.setupSystems()
    this.initializeGame()
  }

  private setupSystems(): void {
    this.inputSystem = new InputSystem()
    this.gameStateSystem = new GameStateSystem(this)
    this.world.addSystem(this.inputSystem)
    this.world.addSystem(new MovementSystem())
    this.world.addSystem(new CollisionSystem())
    this.world.addSystem(new TTLSystem())
    this.world.addSystem(this.gameStateSystem)
    /*
    Se está pasando la propia instancia de la clase AsteroidsGame como argumento al constructor de GameStateSystem.

    ¿Por qué se hace esto?

    - Así, GameStateSystem puede acceder directamente a métodos y propiedades de la instancia principal del juego (AsteroidsGame).
    - Por ejemplo, puede consultar si el juego está pausado, reiniciarlo, acceder al mundo de entidades, o actualizar el estado del juego.
    - Es una práctica común cuando un sistema necesita interactuar o tener contexto del entorno global, más allá de sus propias responsabilidades.
    */
  }

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
  private spawnInitialAsteroids(total:number): void {
    for (let i = 0; i < total; i++) {
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

  pause(): void {
    this.isPaused = true
    console.log("Game Paused")
  }

  resume(): void {
    if (this.isPaused && this.isRunning) {
      this.isPaused = false
      this.lastTime = performance.now() // Reset tiempo para evitar deltaTime gigante
      console.log("Game Resumed")
    }
  }

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

  getIsPaused(): boolean {
    return this.isPaused
  }

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