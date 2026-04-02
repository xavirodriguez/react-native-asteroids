import { System } from "../core/System";
import { World } from "../core/World";
import { VelocityComponent, FrictionComponent } from "../types/EngineTypes";

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

    // Calculate normalized factor based on 60 FPS reference
    const dtFactor = deltaTime / (1000 / 60);

    entities.forEach((entity) => {
      const vel = world.getComponent<VelocityComponent>(entity, "Velocity")!;
      const friction = world.getComponent<FrictionComponent>(entity, "Friction")!;

      const frictionFactor = Math.pow(friction.value, dtFactor);
      vel.dx *= frictionFactor;
      vel.dy *= frictionFactor;
    });
  }
}
