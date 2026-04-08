import { System } from "../core/System";
import { World } from "../core/World";
import { TransformComponent, VelocityComponent } from "../types/EngineTypes";
import { PhysicsUtils } from "../utils/PhysicsUtils";

/**
 * Generic system responsible for updating entity positions based on their velocity.
 * This is a pure linear integrator.
 */
export class MovementSystem extends System {
  public update(world: World, deltaTime: number): void {
    const entities = world.query("Transform", "Velocity");
    const dtSeconds = deltaTime / 1000;

    entities.forEach((entity) => {
      const pos = world.getComponent<TransformComponent>(entity, "Transform");
      const vel = world.getComponent<VelocityComponent>(entity, "Velocity");

      if (pos && vel) {
        PhysicsUtils.integrateMovement(pos, vel, dtSeconds);
      }
    });
  }
}
