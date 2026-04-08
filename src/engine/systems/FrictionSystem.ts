import { System } from "../core/System";
import { World } from "../core/World";
import { VelocityComponent, FrictionComponent } from "../types/EngineTypes";
import { PhysicsUtils } from "../utils/PhysicsUtils";

/**
 * Generic Friction System for the TinyAsterEngine.
 * Applies velocity damping based on a friction coefficient.
 */
export class FrictionSystem extends System {
  /**
   * Updates entities with velocity and friction.
   */
  public update(world: World, deltaTime: number): void {
    const entities = world.query("Velocity", "Friction");

    entities.forEach((entity) => {
      const vel = world.getComponent<VelocityComponent>(entity, "Velocity")!;
      const friction = world.getComponent<FrictionComponent>(entity, "Friction")!;

      PhysicsUtils.applyFriction(vel, friction.value, deltaTime);
    });
  }
}
