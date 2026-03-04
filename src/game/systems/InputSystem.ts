import { System, type World } from "../ecs-world"
import {
  type InputComponent,
  type VelocityComponent,
  type RenderComponent,
  type PositionComponent,
  type InputState,
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

  /**
   * Creates a new InputSystem and sets up keyboard listeners if in a browser environment.
   */
  constructor() {
    super()
    this.registerKeyboardListeners()
  }

  private registerKeyboardListeners(): void {
    const isBrowser = typeof window !== "undefined" && typeof window.addEventListener === "function"
    if (isBrowser) {
      window.addEventListener("keydown", (e) => this.keys.add(e.code))
      window.addEventListener("keyup", (e) => this.keys.delete(e.code))
    }
  }
  
  /**
   * Manually sets the input state. Useful for mobile touch controls.
   *
   * @param input - The new input state.
   */
  setInput(input: Partial<InputState>): void {
    this.updateKey(GAME_CONFIG.KEYS.THRUST, input.thrust)
    this.updateKey(GAME_CONFIG.KEYS.ROTATE_LEFT, input.rotateLeft)
    this.updateKey(GAME_CONFIG.KEYS.ROTATE_RIGHT, input.rotateRight)
    this.updateKey(GAME_CONFIG.KEYS.SHOOT, input.shoot)
  }

  private updateKey(keyCode: string, isActive?: boolean): void {
    if (isActive === undefined) return
    if (isActive) {
      this.keys.add(keyCode)
    } else {
      this.keys.delete(keyCode)
    }
  }

  /**
   * Updates ship rotation, velocity, and shooting based on current input state.
   *
   * @param world - The ECS world.
   * @param deltaTime - Time since last frame in milliseconds.
   */
  update(world: World, deltaTime: number): void {
    const ships = world.query("Input", "Position", "Velocity", "Render")

    ships.forEach((entity) => {
      const input = world.getComponent<InputComponent>(entity, "Input")!
      const vel = world.getComponent<VelocityComponent>(entity, "Velocity")!
      const render = world.getComponent<RenderComponent>(entity, "Render")!
      const pos = world.getComponent<PositionComponent>(entity, "Position")!

      this.updateShootingCooldown(input, deltaTime)
      this.updateShipInputState(input)
      this.applyShipMovement({ vel, render, input, deltaTime })
      this.handleShipShooting({ world, pos, render, input })
    })
  }

  private updateShootingCooldown(input: InputComponent, deltaTime: number): void {
    if (input.shootCooldownRemaining > 0) {
      input.shootCooldownRemaining -= deltaTime
    }
  }

  private updateShipInputState(input: InputComponent): void {
    input.thrust = this.keys.has(GAME_CONFIG.KEYS.THRUST)
    input.rotateLeft = this.keys.has(GAME_CONFIG.KEYS.ROTATE_LEFT)
    input.rotateRight = this.keys.has(GAME_CONFIG.KEYS.ROTATE_RIGHT)
    input.shoot = this.keys.has(GAME_CONFIG.KEYS.SHOOT)
  }

  private applyShipMovement(params: {
    vel: VelocityComponent
    render: RenderComponent
    input: InputComponent
    deltaTime: number
  }): void {
    const { vel, render, input, deltaTime } = params
    const dt = deltaTime / 1000

    this.applyRotation({ render, input, dt })
    this.applyThrust({ vel, render, input, dt })
    this.applyFriction(vel)
  }

  private applyRotation(params: { render: RenderComponent; input: InputComponent; dt: number }): void {
    const { render, input, dt } = params
    if (input.rotateLeft) render.rotation -= GAME_CONFIG.SHIP_ROTATION_SPEED * dt
    if (input.rotateRight) render.rotation += GAME_CONFIG.SHIP_ROTATION_SPEED * dt
  }

  private applyThrust(params: {
    vel: VelocityComponent
    render: RenderComponent
    input: InputComponent
    dt: number
  }): void {
    const { vel, render, input, dt } = params
    if (input.thrust) {
      vel.dx += Math.cos(render.rotation) * GAME_CONFIG.SHIP_THRUST * dt
      vel.dy += Math.sin(render.rotation) * GAME_CONFIG.SHIP_THRUST * dt
    }
  }

  private applyFriction(vel: VelocityComponent): void {
    vel.dx *= GAME_CONFIG.SHIP_FRICTION
    vel.dy *= GAME_CONFIG.SHIP_FRICTION
  }

  private handleShipShooting(params: {
    world: World
    pos: PositionComponent
    render: RenderComponent
    input: InputComponent
  }): void {
    const { world, pos, render, input } = params
    const canShoot = input.shoot && input.shootCooldownRemaining <= 0
    if (canShoot) {
      createBullet({ world, x: pos.x, y: pos.y, angle: render.rotation })
      input.shootCooldownRemaining = GAME_CONFIG.BULLET_SHOOT_COOLDOWN
    }
  }
}
