import { System } from "../core/System";
import { World } from "../core/World";
import { PositionComponent, VelocityComponent } from "../types/EngineTypes";

/**
 * Generic system responsible for updating entity positions based on their velocity.
 * This is a pure linear integrator.
 */
export class MovementSystem extends System {
  public update(world: World, deltaTime: number): void {
    const entities = world.query("Position", "Velocity");

    entities.forEach((entity) => {
      const pos = world.getComponent<PositionComponent>(entity, "Position");
      const vel = world.getComponent<VelocityComponent>(entity, "Velocity");

      if (pos && vel) {
        const dt = deltaTime / 1000;
        pos.x += vel.dx * dt;
        pos.y += vel.dy * dt;
      }
    });
  }
}
