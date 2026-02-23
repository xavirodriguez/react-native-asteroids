import { System, type World } from "../ecs-world"
import {
  type InputComponent,
  type VelocityComponent,
  type RenderComponent,
  type PositionComponent,
  GAME_CONFIG,
} from "../../types/GameTypes"
import { createBullet } from "../EntityFactory"

/**
 * System responsible for processing user input and applying it to the ship's state.
 *
 * @remarks
 * This system supports both keyboard input (web) and manual input setting (mobile/touch).
 * It updates the ship's rotation, velocity (thrust), and handles bullet spawning (shooting).
 */
export class InputSystem extends System {
  /** Set of currently pressed keys (for web/keyboard). */
  private keys: Set<string> = new Set()

  /** Timestamp of the last shot fired. */
  private lastShootTime = 0

  /** Cooldown time between shots in milliseconds. */
  private shootCooldown = 200

  /**
   * Creates a new InputSystem and sets up keyboard listeners if in a browser environment.
   */
  constructor() {
    super()
    // Web keyboard support
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", (e) => this.keys.add(e.code))
      window.addEventListener("keyup", (e) => this.keys.delete(e.code))
    }
  }
  
  /**
   * Manually sets the input state. Useful for mobile touch controls.
   *
   * @param thrust - Whether thrust is active.
   * @param rotateLeft - Whether rotating left is active.
   * @param rotateRight - Whether rotating right is active.
   * @param shoot - Whether shooting is active.
   */
  setInput(thrust: boolean, rotateLeft: boolean, rotateRight: boolean, shoot: boolean): void {
    this.keys.clear()
    if (thrust) this.keys.add("ArrowUp")
    if (rotateLeft) this.keys.add("ArrowLeft")
    if (rotateRight) this.keys.add("ArrowRight")
    if (shoot) this.keys.add("Space")
  }

  /**
   * Updates ship rotation, velocity, and shooting based on current input state.
   *
   * @param world - The ECS world.
   * @param deltaTime - Time since last frame in milliseconds.
   */
  update(world: World, deltaTime: number): void {
    const ships = world.query("Input", "Position", "Velocity", "Render")
    const currentTime = Date.now()

    ships.forEach((entity) => {
      const input = world.getComponent<InputComponent>(entity, "Input")!
      const vel = world.getComponent<VelocityComponent>(entity, "Velocity")!
      const render = world.getComponent<RenderComponent>(entity, "Render")!
      const pos = world.getComponent<PositionComponent>(entity, "Position")!

      this.updateShipInputState(input)
      this.applyShipMovement(vel, render, input, deltaTime)
      this.handleShipShooting(world, pos, render, input, currentTime)
    })
  }

  private updateShipInputState(input: InputComponent): void {
    input.thrust = this.keys.has("ArrowUp")
    input.rotateLeft = this.keys.has("ArrowLeft")
    input.rotateRight = this.keys.has("ArrowRight")
    input.shoot = this.keys.has("Space")
  }

  private applyShipMovement(
    vel: VelocityComponent,
    render: RenderComponent,
    input: InputComponent,
    deltaTime: number,
  ): void {
    const dt = deltaTime / 1000

    if (input.rotateLeft) render.rotation -= GAME_CONFIG.SHIP_ROTATION_SPEED * dt
    if (input.rotateRight) render.rotation += GAME_CONFIG.SHIP_ROTATION_SPEED * dt

    if (input.thrust) {
      vel.dx += Math.cos(render.rotation) * GAME_CONFIG.SHIP_THRUST * dt
      vel.dy += Math.sin(render.rotation) * GAME_CONFIG.SHIP_THRUST * dt
    }

    vel.dx *= 0.99
    vel.dy *= 0.99
  }

  private handleShipShooting(
    world: World,
    pos: PositionComponent,
    render: RenderComponent,
    input: InputComponent,
    currentTime: number,
  ): void {
    const canShoot = input.shoot && currentTime - this.lastShootTime > this.shootCooldown
    if (canShoot) {
      createBullet(world, pos.x, pos.y, render.rotation)
      this.lastShootTime = currentTime
    }
  }
}
