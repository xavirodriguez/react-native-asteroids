import { System } from "../core/System";
import { World } from "../core/World";
import { VelocityComponent, FrictionComponent } from "../types/EngineTypes";
import { PhysicsUtils } from "../utils/PhysicsUtils";

/**
 * Sistema genérico de fricción.
 * Aplica una amortiguación a la velocidad lineal basada en un coeficiente de fricción.
 *
 * @responsibility Reducir gradualmente la velocidad de las entidades.
 * @queries Velocity, Friction
 * @mutates Velocity.dx, Velocity.dy
 * @executionOrder Fase: Simulation.
 *
 * @contract Amortiguación: La velocidad se reduce según `v = v * (1 - friction * dt)`.
 * @invariant No modifica la posición de la entidad.
 *
 * @conceptualRisk [DETERMINISM][MEDIUM] Al igual que `MovementSystem`, la fricción debe aplicarse
 * de forma idéntica en el cliente y en la predicción para evitar drift.
 * @conceptualRisk [PHYSICS][LOW] Si `friction * dt >= 1`, la velocidad puede invertirse o volverse
 * inestable si no hay un clamp en `PhysicsUtils`.
 */
export class FrictionSystem extends System {
  /**
   * Aplica fricción a todas las entidades compatibles.
   *
   * @param world - El mundo ECS.
   * @param deltaTime - Tiempo transcurrido en milisegundos.
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
