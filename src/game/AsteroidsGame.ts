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
  private lastTime = 0
  private isRunning = false
  private gameLoopId: number | null = null

  constructor() {
    this.world = new World()
    this.setupSystems()
    this.initializeGame()
  }

  private setupSystems(): void {
    this.inputSystem = new InputSystem()
    this.world.addSystem(this.inputSystem)
    this.world.addSystem(new MovementSystem())
    this.world.addSystem(new CollisionSystem())
    this.world.addSystem(new TTLSystem())
    this.world.addSystem(new GameStateSystem())
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
    this.lastTime = performance.now()
    this.gameLoop()
  }

  stop(): void {
    this.isRunning = false
    if (this.gameLoopId) {
      cancelAnimationFrame(this.gameLoopId)
    }
  }

  private gameLoop = (): void => {
    if (!this.isRunning) return

    const currentTime = performance.now()
    const deltaTime = currentTime - this.lastTime
    this.lastTime = currentTime

    // Update all systems
    this.world.update(deltaTime)

    this.gameLoopId = requestAnimationFrame(this.gameLoop)
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
    this.inputSystem.setInput(thrust, rotateLeft, rotateRight, shoot)
  }
}
