import { System, type World } from "../ecs-world"
import {
  type InputComponent,
  type VelocityComponent,
  type RenderComponent,
  type PositionComponent,
  GAME_CONFIG,
} from "../../types/GameTypes"
import { createBullet } from "../EntityFactory"

export class InputSystem extends System {
  private keys: Set<string> = new Set()
  private lastShootTime = 0
  private shootCooldown = 200 // ms

  constructor() {
    super()
    // Web keyboard support
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", (e) => this.keys.add(e.code))
      window.addEventListener("keyup", (e) => this.keys.delete(e.code))
    }
  }
  
  // Method for mobile touch controls
  setInput(thrust: boolean, rotateLeft: boolean, rotateRight: boolean, shoot: boolean): void {
    this.keys.clear()
    if (thrust) this.keys.add("ArrowUp")
    if (rotateLeft) this.keys.add("ArrowLeft")
    if (rotateRight) this.keys.add("ArrowRight")
    if (shoot) this.keys.add("Space")
  }

  update(world: World, deltaTime: number): void {
    const ships = world.query("Input", "Position", "Velocity", "Render")
    const currentTime = Date.now()

    ships.forEach((entity) => {
      const input = world.getComponent<InputComponent>(entity, "Input")!
      const vel = world.getComponent<VelocityComponent>(entity, "Velocity")!
      const render = world.getComponent<RenderComponent>(entity, "Render")!
      const pos = world.getComponent<PositionComponent>(entity, "Position")!

      // Update input state
      input.thrust = this.keys.has("ArrowUp")
      input.rotateLeft = this.keys.has("ArrowLeft")
      input.rotateRight = this.keys.has("ArrowRight")
      input.shoot = this.keys.has("Space")

      // Rotation
      if (input.rotateLeft) render.rotation -= (GAME_CONFIG.SHIP_ROTATION_SPEED * deltaTime) / 1000
      if (input.rotateRight) render.rotation += (GAME_CONFIG.SHIP_ROTATION_SPEED * deltaTime) / 1000

      // Thrust
      if (input.thrust) {
        vel.dx += (Math.cos(render.rotation) * GAME_CONFIG.SHIP_THRUST * deltaTime) / 1000
        vel.dy += (Math.sin(render.rotation) * GAME_CONFIG.SHIP_THRUST * deltaTime) / 1000
      }

      // Apply friction
      vel.dx *= 0.99
      vel.dy *= 0.99

      // Shoot with cooldown
      if (input.shoot && currentTime - this.lastShootTime > this.shootCooldown) {
        createBullet(world, pos.x, pos.y, render.rotation)
        this.lastShootTime = currentTime
      }
    })
  }
}
