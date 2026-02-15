import { System, type World } from "../ecs-world"
import { type PositionComponent, type VelocityComponent, GAME_CONFIG } from "../../types/GameTypes"

/**
 * System responsible for updating the position of entities based on their velocity.
 *
 * @remarks
 * This system applies basic linear motion physics: $position = position + velocity \times deltaTime$.
 * It also implements "screen wrapping", where entities that move off one edge of the
 * screen appear on the opposite edge.
 */
export class MovementSystem extends System {
  /**
   * Updates positions and handles screen wrapping for all moving entities.
   *
   * @param world - The ECS world.
   * @param deltaTime - Time since last frame in milliseconds.
   */
  update(world: World, deltaTime: number): void {
    const entities = world.query("Position", "Velocity")

    entities.forEach((entity) => {
      const pos = world.getComponent<PositionComponent>(entity, "Position")!
      const vel = world.getComponent<VelocityComponent>(entity, "Velocity")!

      // Apply velocity to position
      pos.x += (vel.dx * deltaTime) / 1000
      pos.y += (vel.dy * deltaTime) / 1000

      // Screen wrapping logic
      if (pos.x < 0) pos.x = GAME_CONFIG.SCREEN_WIDTH
      if (pos.x > GAME_CONFIG.SCREEN_WIDTH) pos.x = 0
      if (pos.y < 0) pos.y = GAME_CONFIG.SCREEN_HEIGHT
      if (pos.y > GAME_CONFIG.SCREEN_HEIGHT) pos.y = 0
    })
  }
}
