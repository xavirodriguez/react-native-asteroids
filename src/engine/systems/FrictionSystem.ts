import { System } from "../core/System";
import { World } from "../core/World";
import { VelocityComponent, FrictionComponent } from "../types/EngineTypes";
import { PhysicsUtils } from "../utils/PhysicsUtils";

/**
 * Sistema genérico de fricción.
 * Aplica una amortiguación a la velocidad lineal basada en un coeficiente de fricción.
 *
 * @responsibility Reducir gradualmente la velocidad de las entidades para simular resistencia.
 * @queries Velocity, Friction
 * @mutates Velocity
 * @executionOrder Fase: Simulation. Se recomienda ejecutar después de `MovementSystem` y antes de `CollisionSystem`.
 *
 * @remarks
 * Utiliza amortiguación independiente de la tasa de fotogramas (framerate-independent damping).
 *
 * @conceptualRisk [LINEAR_FRICTION][LOW] El modelo actual es una aproximación exponencial simple
 * que puede no ser suficiente para simulaciones de alta fidelidad.
 */
export class FrictionSystem extends System {
  /**
   * Actualiza la velocidad de todas las entidades que poseen Velocity y Friction.
   *
   * @param world - El mundo ECS.
   * @param deltaTime - Tiempo transcurrido en milisegundos.
   *
   * @invariant El coeficiente de fricción debe ser un valor entre 0 y 1 para un comportamiento estable.
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
