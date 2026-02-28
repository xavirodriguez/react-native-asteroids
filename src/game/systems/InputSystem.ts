import { System, type World } from "../ecs-world"
import {
  type InputComponent,
  type VelocityComponent,
  type RenderComponent,
  type PositionComponent,
  type InputState,
  type Entity,
  GAME_CONFIG,
} from "../../types/GameTypes"
import { createBullet } from "../EntityFactory"

/**
 * Parameters for applying ship movement.
 */
interface ApplyMovementParams {
  vel: VelocityComponent;
  render: RenderComponent;
  input: InputComponent;
  deltaTime: number;
}

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
    this.setupKeyboardListeners()
  }

  /**
   * Sets up keyboard event listeners for web support.
   */
  private setupKeyboardListeners(): void {
    const isWeb = typeof window !== "undefined" && typeof window.addEventListener === "function"
    if (isWeb) {
      window.addEventListener("keydown", (e) => this.keys.add(e.code))
      window.addEventListener("keyup", (e) => this.keys.delete(e.code))
    }
  }

  /**
   * Manually sets the input state. Useful for mobile touch controls.
   *
   * @param input - The new input state.
   */
  public setInput(input: Partial<InputState>): void {
    const { KEYS } = GAME_CONFIG
    this.updateKey(KEYS.THRUST, input.thrust)
    this.updateKey(KEYS.ROTATE_LEFT, input.rotateLeft)
    this.updateKey(KEYS.ROTATE_RIGHT, input.rotateRight)
    this.updateKey(KEYS.SHOOT, input.shoot)
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
  public update(world: World, deltaTime: number): void {
    const ships = world.query("Input", "Position", "Velocity", "Render")
    ships.forEach((entity) => this.updateShipEntity(world, entity, deltaTime))
  }

  private updateShipEntity(world: World, entity: Entity, deltaTime: number): void {
    const input = world.getComponent<InputComponent>(entity, "Input")!
    const vel = world.getComponent<VelocityComponent>(entity, "Velocity")!
    const render = world.getComponent<RenderComponent>(entity, "Render")!
    const pos = world.getComponent<PositionComponent>(entity, "Position")!

    this.updateCooldown(input, deltaTime)
    this.updateShipInputState(input)
    this.applyShipMovement({ vel, render, input, deltaTime })
    this.handleShipShooting(world, pos, render, input)
  }

  private updateCooldown(input: InputComponent, deltaTime: number): void {
    if (input.shootCooldownRemaining > 0) {
      input.shootCooldownRemaining -= deltaTime
    }
  }

  private updateShipInputState(input: InputComponent): void {
    const { KEYS } = GAME_CONFIG
    input.thrust = this.keys.has(KEYS.THRUST)
    input.rotateLeft = this.keys.has(KEYS.ROTATE_LEFT)
    input.rotateRight = this.keys.has(KEYS.ROTATE_RIGHT)
    input.shoot = this.keys.has(KEYS.SHOOT)
  }

  private applyShipMovement(params: ApplyMovementParams): void {
    const { vel, render, input, deltaTime } = params
    const dt = deltaTime / 1000

    this.applyRotation(render, input, dt)
    this.applyThrust(vel, render, input, dt)
    this.applyFriction(vel)
  }

  private applyRotation(render: RenderComponent, input: InputComponent, dt: number): void {
    const speed = GAME_CONFIG.SHIP_ROTATION_SPEED
    if (input.rotateLeft) render.rotation -= speed * dt
    if (input.rotateRight) render.rotation += speed * dt
  }

  private applyThrust(vel: VelocityComponent, render: RenderComponent, input: InputComponent, dt: number): void {
    if (input.thrust) {
      const force = GAME_CONFIG.SHIP_THRUST
      vel.dx += Math.cos(render.rotation) * force * dt
      vel.dy += Math.sin(render.rotation) * force * dt
    }
  }

  private applyFriction(vel: VelocityComponent): void {
    const friction = GAME_CONFIG.SHIP_FRICTION
    vel.dx *= friction
    vel.dy *= friction
  }

  private handleShipShooting(
    world: World,
    pos: PositionComponent,
    render: RenderComponent,
    input: InputComponent,
  ): void {
    const canShoot = input.shoot && input.shootCooldownRemaining <= 0
    if (canShoot) {
      createBullet({ world, x: pos.x, y: pos.y, angle: render.rotation })
      input.shootCooldownRemaining = GAME_CONFIG.BULLET_SHOOT_COOLDOWN
    }
  }
}
