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
  private keyDownListener = (e: KeyboardEvent) => this.activateKey(e.code)
  private keyUpListener = (e: KeyboardEvent) => this.deactivateKey(e.code)

  /**
   * Creates a new InputSystem and sets up keyboard listeners if in a browser environment.
   */
  constructor() {
    super()
    this.registerKeyboardListeners()
  }

  /**
   * Cleans up event listeners when the system is no longer needed.
   */
  public cleanup(): void {
    const isBrowser = typeof window !== "undefined" && typeof window.removeEventListener === "function"
    if (isBrowser) {
      window.removeEventListener("keydown", this.keyDownListener)
      window.removeEventListener("keyup", this.keyUpListener)
    }
  }

  /**
   * Manually sets the input state. Useful for mobile touch controls.
   *
   * @param input - The new input state.
   */
  public setInput(input: Partial<InputState>): void {
    this.syncAllInputs(input)
  }

  /**
   * Updates ship rotation, velocity, and shooting based on current input state.
   *
   * @param world - The ECS world.
   * @param deltaTime - Time since last frame in milliseconds.
   */
  public update(world: World, deltaTime: number): void {
    const ships = world.query("Ship", "Input", "Position", "Velocity", "Render")
    ships.forEach((entity) => this.updateShipEntity({ world, entity, deltaTime }))
  }

  private updateShipEntity(params: { world: World; entity: number; deltaTime: number }): void {
    const { world, entity, deltaTime } = params
    const input = world.getComponent<InputComponent>(entity, "Input")!

    this.updateShipState(input, deltaTime)
    this.processShipActions({ world, entity, input, deltaTime })
  }

  private updateShipState(input: InputComponent, deltaTime: number): void {
    this.updateShootingCooldown(input, deltaTime)
    this.updateShipInputState(input)
  }

  private processShipActions(params: {
    world: World
    entity: number
    input: InputComponent
    deltaTime: number
  }): void {
    const { world, entity, input, deltaTime } = params
    const vel = world.getComponent<VelocityComponent>(entity, "Velocity")!
    const render = world.getComponent<RenderComponent>(entity, "Render")!
    const pos = world.getComponent<PositionComponent>(entity, "Position")!

    this.applyShipMovement({ vel, render, input, deltaTime })
    this.handleShipShooting({ world, pos, render, input })
  }

  private syncAllInputs(input: Partial<InputState>): void {
    this.syncAction(GAME_CONFIG.KEYS.THRUST, input.thrust)
    this.syncAction(GAME_CONFIG.KEYS.ROTATE_LEFT, input.rotateLeft)
    this.syncAction(GAME_CONFIG.KEYS.ROTATE_RIGHT, input.rotateRight)
    this.syncAction(GAME_CONFIG.KEYS.SHOOT, input.shoot)
  }

  private syncAction(keyCode: string, isActive: boolean | undefined): void {
    if (isActive === undefined) return

    if (isActive) {
      this.activateKey(keyCode)
    } else {
      this.deactivateKey(keyCode)
    }
  }

  private registerKeyboardListeners(): void {
    const isBrowser = typeof window !== "undefined" && typeof window.addEventListener === "function"
    if (isBrowser) {
      window.addEventListener("keydown", this.keyDownListener)
      window.addEventListener("keyup", this.keyUpListener)
    }
  }

  private activateKey(keyCode: string): void {
    this.keys.add(keyCode)
  }

  private deactivateKey(keyCode: string): void {
    this.keys.delete(keyCode)
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
    this.applyFriction(vel, deltaTime)
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

  private applyFriction(vel: VelocityComponent, deltaTime: number): void {
    const frictionFactor = Math.pow(GAME_CONFIG.SHIP_FRICTION, deltaTime / (1000 / 60))
    vel.dx *= frictionFactor
    vel.dy *= frictionFactor
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
