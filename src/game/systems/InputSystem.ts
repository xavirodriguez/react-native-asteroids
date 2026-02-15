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
 * System responsible for processing user input and applying it to controlled entities.
 *
 * @remarks
 * This system handles both keyboard events (for web) and manual input settings
 * (typically for mobile touch controls). It updates the {@link InputComponent} of
 * entities and translates those inputs into physical changes (rotation, thrust)
 * or actions (shooting).
 */
export class InputSystem extends System {
  /** Set of currently pressed keyboard keys (by their `code`). */
  private keys: Set<string> = new Set()

  /** Timestamp of the last shot fired to handle cooldown. */
  private lastShootTime = 0

  /** Minimum delay between shots in milliseconds. */
  private shootCooldown = 200

  /**
   * Initializes the InputSystem and sets up global keyboard event listeners if in a browser environment.
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
   * Manually updates the internal key state, primarily used for mobile touch controls.
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
   * Updates controlled entities based on the current input state.
   *
   * @param world - The ECS world.
   * @param deltaTime - Time since last frame in milliseconds.
   *
   * @remarks
   * For each entity with {@link InputComponent}, {@link PositionComponent},
   * {@link VelocityComponent}, and {@link RenderComponent}:
   * 1. Updates the `InputComponent` state from the current key set.
   * 2. Adjusts `RenderComponent.rotation` based on rotation inputs.
   * 3. Applies acceleration to `VelocityComponent` based on thrust input.
   * 4. Applies a small friction factor to the velocity.
   * 5. Spawns bullets if shooting and cooldown has elapsed.
   */
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

      // Apply friction (simple damping)
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
