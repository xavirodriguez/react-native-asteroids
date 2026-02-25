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

const KEYS = {
  THRUST: "ArrowUp",
  ROTATE_LEFT: "ArrowLeft",
  ROTATE_RIGHT: "ArrowRight",
  SHOOT: "Space",
} as const

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

  /** Current state of manual inputs (e.g., from touch controls). */
  private manualInput: InputState = {
    thrust: false,
    rotateLeft: false,
    rotateRight: false,
    shoot: false,
  }

  /** Time remaining until the next shot can be fired. */
  private shootCooldownRemaining = 0

  /** Cooldown time between shots in milliseconds. */
  private readonly SHOOT_COOLDOWN = 200

  /**
   * Creates a new InputSystem and sets up keyboard listeners if in a browser environment.
   */
  constructor() {
    super()
    this.setupKeyboardListeners()
  }

  private setupKeyboardListeners(): void {
    if (typeof window !== "undefined" && window.addEventListener) {
      window.addEventListener("keydown", (e) => this.keys.add(e.code))
      window.addEventListener("keyup", (e) => this.keys.delete(e.code))
    }
  }

  /**
   * Manually sets the input state. Useful for mobile touch controls.
   *
   * @param input - Partial input state to update.
   */
  public setInput(input: Partial<InputState>): void {
    this.manualInput = {
      ...this.manualInput,
      ...input,
    }
  }

  /**
   * Updates ship rotation, velocity, and shooting based on current input state.
   */
  public update(world: World, deltaTime: number): void {
    const ships = world.query("Input", "Position", "Velocity", "Render")
    this.updateCooldown(deltaTime)

    ships.forEach((entity) => {
      const input = world.getComponent<InputComponent>(entity, "Input")!
      const vel = world.getComponent<VelocityComponent>(entity, "Velocity")!
      const render = world.getComponent<RenderComponent>(entity, "Render")!
      const pos = world.getComponent<PositionComponent>(entity, "Position")!

      this.synchronizeInputState(input)
      this.applyShipMovement(vel, render, input, deltaTime)
      this.handleShipShooting(world, pos, render, input)
    })
  }

  private updateCooldown(deltaTime: number): void {
    if (this.shootCooldownRemaining > 0) {
      this.shootCooldownRemaining -= deltaTime
    }
  }

  private synchronizeInputState(input: InputComponent): void {
    input.thrust = this.keys.has(KEYS.THRUST) || this.manualInput.thrust
    input.rotateLeft = this.keys.has(KEYS.ROTATE_LEFT) || this.manualInput.rotateLeft
    input.rotateRight = this.keys.has(KEYS.ROTATE_RIGHT) || this.manualInput.rotateRight
    input.shoot = this.keys.has(KEYS.SHOOT) || this.manualInput.shoot
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
  ): void {
    const canShoot = input.shoot && this.shootCooldownRemaining <= 0
    if (canShoot) {
      createBullet(world, pos.x, pos.y, render.rotation)
      this.shootCooldownRemaining = this.SHOOT_COOLDOWN
    }
  }
}
