import { System } from "../core/System";
import { World } from "../core/World";
import { VelocityComponent, FrictionComponent } from "../types/EngineTypes";
import { PhysicsUtils } from "../utils/PhysicsUtils";

/**
 * Sistema genérico de fricción.
 * Aplica una amortiguación a la velocidad lineal basada en un coeficiente.
 *
 * @responsibility Reducir gradualmente la velocidad de las entidades.
 * @queries Velocity, Friction
 * @mutates Velocity
 * @executionOrder Fase: Simulation.
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
