import { System } from "../../ecs/System";
import { World } from "../../ecs/World";
import { VelocityComponent, FrictionComponent } from "../../ecs/CoreComponents";
import { PhysicsUtils } from "../utils/PhysicsUtils";

/**
 * Sistema genérico de fricción.
 * Aplica una amortiguación a la velocidad lineal basada en un coeficiente de fricción.
 *
 * @responsibility Reducir gradualmente la velocidad de las entidades.
 * @queries Velocity, Friction
 * @mutates Velocity.dx, Velocity.dy
 * @dependsOn {@link PhysicsUtils.applyFriction}
 * @executionOrder Fase: Simulation.
 *
 * @remarks
 * La fricción se aplica buscando reducir la velocidad cada frame, ideal para simular resistencia
 * arcade. El cálculo intenta ser independiente del framerate delegando en {@link PhysicsUtils}.
 *
 * @conceptualRisk [DETERMINISM][MEDIUM] Al igual que `MovementSystem`, la fricción se debe aplicar
 * de forma consistente en el cliente y en la predicción para minimizar el drift.
 * @conceptualRisk [PHYSICS][LOW] Si `friction * dt >= 1`, la velocidad puede invertirse o volverse
 * inestable si no hay un clamp en `PhysicsUtils`.
 */
export class FrictionSystem extends System {
  /**
   * Aplica fricción a todas las entidades compatibles.
   *
   * @param world - El mundo ECS.
   * @param deltaTime - Tiempo transcurrido en milisegundos.
   *
   * @remarks
   * Se espera que las entidades posean componentes {@link VelocityComponent} y {@link FrictionComponent}.
   * Los componentes `dx` y `dy` de la velocidad se reducen según el factor de fricción.
   */
  public update(world: World, deltaTime: number): void {
    const entities = world.query("Velocity", "Friction");

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const vel = world.getComponent<VelocityComponent>(entity, "Velocity")!;
      const friction = world.getComponent<FrictionComponent>(entity, "Friction")!;

      if (world.hasComponent(entity, "ManualMovement")) continue;
      PhysicsUtils.applyFriction(vel, friction.value, deltaTime);
    }
  }
}
