import { System } from "../core/System";
import { World } from "../core/World";
import { TransformComponent, VelocityComponent } from "../types/EngineTypes";
import { PhysicsUtils } from "../utils/PhysicsUtils";

/**
 * Sistema genérico encargado de actualizar las posiciones de las entidades basado en su velocidad.
 * Implementa un integrador lineal simple (Euler).
 *
 * @responsibility Integrar la velocidad en la posición para el tick actual.
 * @queries Transform, Velocity
 * @mutates Transform
 * @executionOrder Fase: Simulation. Debe ejecutarse antes de Collision y Boundary.
 *
 * @conceptualRisk [PRECISION][LOW] Utiliza integración de Euler simple; en juegos de alta velocidad
 * o baja tasa de refresco, esto puede causar que los colisionadores atraviesen paredes (tunneling).
 */
export class MovementSystem extends System {
  /**
   * Actualiza la posición de todas las entidades que poseen Transform y Velocity.
   *
   * @param world - El mundo ECS.
   * @param deltaTime - Tiempo en milisegundos. Se convierte internamente a segundos para paridad física.
   *
   * @invariant La velocidad se integra de forma independiente en los ejes X e Y.
   * @conceptualRisk [UNIT_DRIFT] Si `PhysicsUtils.integrateMovement` espera segundos pero recibe ms,
   * la simulación se acelerará 1000 veces. MovementSystem garantiza la conversión a segundos.
   */
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
