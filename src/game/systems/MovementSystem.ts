import { System, type World } from "../ecs-world"
import {
  type PositionComponent,
  type VelocityComponent,
  type RenderComponent,
  type InputComponent,
  GAME_CONFIG,
} from "../../types/GameTypes"
import { createParticle } from "../EntityFactory"

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
        // Improvement 2: Ship trail update
        if (render && render.trailPositions) {
            render.trailPositions.push({ x: pos.x, y: pos.y });
            if (render.trailPositions.length > GAME_CONFIG.TRAIL_MAX_LENGTH) {
                render.trailPositions.shift();
            }
        }

        this.updatePosition({ pos, vel, deltaTime })
        this.updateRotation({ render, deltaTime })
        this.handleThrustParticles({ world, entity, pos, render })
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

  private updateRotation(context: { render: RenderComponent | undefined; deltaTime: number }): void {
    const { render, deltaTime } = context;
    if (render && render.angularVelocity) {
      const dt = deltaTime / 1000;
      render.rotation += render.angularVelocity * dt;
    }
  }

  private handleThrustParticles(context: {
    world: World
    entity: number
    pos: PositionComponent
    render: RenderComponent | undefined
  }): void {
    const { world, entity, pos, render } = context;
    if (!render || render.shape !== "triangle") return;

    const input = world.getComponent<InputComponent>(entity, "Input");
    if (input && input.thrust && Math.random() > 0.5) {
      // Spawn a small thrust particle behind the ship
      const angle = render.rotation + Math.PI; // Opposite direction
      const speed = 50 + Math.random() * 50;
      createParticle({
        world,
        x: pos.x - Math.cos(render.rotation) * render.size,
        y: pos.y - Math.sin(render.rotation) * render.size,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        color: "#FF6600",
        ttl: 200 + Math.random() * 200,
        size: 1 + Math.random() * 2,
      });
    }
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
