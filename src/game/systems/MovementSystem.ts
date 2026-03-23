import { System, type World } from "../ecs-world"
import {
  type PositionComponent,
  type VelocityComponent,
  type RenderComponent,
  GAME_CONFIG,
} from "../../types/GameTypes"

/**
 * System responsible for updating entity positions based on their velocity.
 */
export class MovementSystem extends System {
  /**
   * Updates positions and handles screen wrapping.
   */
  public update(world: World, deltaTime: number): void {
    const entities = world.query("Position", "Velocity");

    entities.forEach((entity) => {
      const pos = world.getComponent<PositionComponent>(entity, "Position")
      const vel = world.getComponent<VelocityComponent>(entity, "Velocity")
      const render = world.getComponent<RenderComponent>(entity, "Render")

      if (pos && vel) {
        // Improvement 2 & 6: Trail update for ship and bullets
        if (render && render.trailPositions) {
          const isBullet = world.hasComponent(entity, "Bullet")
          const maxLength = isBullet ? 6 : GAME_CONFIG.TRAIL_MAX_LENGTH

          render.trailPositions.push({ x: pos.x, y: pos.y })
          if (render.trailPositions.length > maxLength) {
            render.trailPositions.shift()
          }
        }

        this.updatePosition({ pos, vel, deltaTime })
        this.wrapPosition(pos)
      }
    })
  }

  private updatePosition(context: {
    pos: PositionComponent
    vel: VelocityComponent
    deltaTime: number
  }): void {
    const { pos, vel, deltaTime } = context;
    const dt = deltaTime / 1000;
    pos.x += vel.dx * dt;
    pos.y += vel.dy * dt;
  }

  private wrapPosition(pos: PositionComponent): void {
    const { SCREEN_WIDTH: width, SCREEN_HEIGHT: height } = GAME_CONFIG;

    this.wrapCoordinate({ pos, axis: "x", max: width });
    this.wrapCoordinate({ pos, axis: "y", max: height });
  }

  private wrapCoordinate(config: { pos: PositionComponent; axis: "x" | "y"; max: number }): void {
    const { pos, axis, max } = config;
    if (pos[axis] < 0) {
      pos[axis] = max;
    } else if (pos[axis] > max) {
      pos[axis] = 0;
    }
  }
}
