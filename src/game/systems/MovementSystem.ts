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
      const pos = world.getComponent<PositionComponent>(entity, "Position")!;
      const vel = world.getComponent<VelocityComponent>(entity, "Velocity")!;

      this.updatePosition(pos, vel, deltaTime);
      this.wrapPosition(pos);
    });
  }

  private updatePosition(pos: PositionComponent, vel: VelocityComponent, deltaTime: number): void {
    const dt = deltaTime / 1000;
    pos.x += vel.dx * dt;
    pos.y += vel.dy * dt;
  }

  private wrapPosition(pos: PositionComponent): void {
    const { SCREEN_WIDTH: width, SCREEN_HEIGHT: height } = GAME_CONFIG;

    if (pos.x < 0) pos.x = width;
    else if (pos.x > width) pos.x = 0;

    if (pos.y < 0) pos.y = height;
    else if (pos.y > height) pos.y = 0;
  }
}
