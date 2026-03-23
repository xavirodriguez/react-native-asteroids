import { System } from "../../core/System";
import { World } from "../../core/World";
import {
  PositionComponent,
  VelocityComponent,
  RenderComponent,
} from "../../types";

export interface MovementConfig {
  wrap?: boolean;
  bounds?: {
    width: number;
    height: number;
  };
}

/**
 * System responsible for updating entity positions based on their velocity.
 * Completely agnostic to game entities.
 */
export class MovementSystem extends System {
  constructor(private config: MovementConfig) {
    super();
  }

  public update(world: World, deltaTime: number): void {
    const entities = world.query("Position", "Velocity");

    entities.forEach((entity) => {
      const pos = world.getComponent<PositionComponent>(entity, "Position");
      const vel = world.getComponent<VelocityComponent>(entity, "Velocity");
      const render = world.getComponent<RenderComponent>(entity, "Render");

      if (pos && vel) {
        // Trail update
        if (render && render.trailPositions) {
          const maxLength = render.trailMaxLength || 12;

          render.trailPositions.push({ x: pos.x, y: pos.y });
          if (render.trailPositions.length > maxLength) {
            render.trailPositions.shift();
          }
        }

        const dt = deltaTime / 1000;
        pos.x += vel.dx * dt;
        pos.y += vel.dy * dt;

        if (this.config.wrap && this.config.bounds) {
          this.wrapPosition(pos, this.config.bounds.width, this.config.bounds.height);
        }
      }
    });
  }

  private wrapPosition(pos: PositionComponent, width: number, height: number): void {
    if (pos.x < 0) pos.x = width;
    else if (pos.x > width) pos.x = 0;

    if (pos.y < 0) pos.y = height;
    else if (pos.y > height) pos.y = 0;
  }
}
