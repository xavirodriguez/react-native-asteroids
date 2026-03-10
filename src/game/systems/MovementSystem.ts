import { System, type World } from "../ecs-world"
import {
  type PositionComponent,
  type VelocityComponent,
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
      const pos = world.getComponent<PositionComponent>(entity, "Position");
      const vel = world.getComponent<VelocityComponent>(entity, "Velocity");

      if (pos && vel) {
        this.updatePosition({ pos, vel, deltaTime });
        this.wrapPosition(pos);
      }
    });
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

    this.wrapCoordinate(pos, "x", width);
    this.wrapCoordinate(pos, "y", height);
  }

  private wrapCoordinate(pos: PositionComponent, axis: "x" | "y", max: number): void {
    if (pos[axis] < 0) {
      pos[axis] = max;
    } else if (pos[axis] > max) {
      pos[axis] = 0;
    }
  }
}
