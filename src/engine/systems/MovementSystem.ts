import { System } from "../core/System";
import { World } from "../core/World";
import { TransformComponent, VelocityComponent } from "../types/EngineTypes";
import { PhysicsUtils } from "../utils/PhysicsUtils";

/**
 * Sistema genérico encargado de actualizar las posiciones de las entidades basado en su velocidad.
 * Implementa un integrador lineal simple (Euler explicit).
 *
 * @responsibility Integrar la velocidad en la posición para el tick actual.
 * @queries Transform, Velocity
 * @mutates Transform.x, Transform.y
 * @dependsOn {@link PhysicsUtils.integrateMovement}
 * @executionOrder Fase: Simulation. Debe ejecutarse antes de Collision y Boundary.
 *
 * @remarks
 * Este sistema es el motor de movimiento principal para todas las entidades físicas no estáticas.
 * Utiliza {@link PhysicsUtils} para asegurar consistencia con el código de predicción.
 *
 * @conceptualRisk [DETERMINISM][CRITICAL] Existe lógica de integración duplicada entre este sistema
 * y los helpers de predicción (ej. `predictLocalPlayer` en Asteroids). Cualquier cambio en `PhysicsUtils`
 * debe ser verificado en ambos contextos para evitar desincronización en red.
 * @conceptualRisk [TIME][LOW] El sistema recibe `deltaTime` en ms pero `PhysicsUtils` opera en segundos.
 * Riesgo de errores de precisión por conversiones repetitivas si no se estandariza a nivel de motor.
 */
export class MovementSystem extends System {
  /**
   * Actualiza la posición de todas las entidades que poseen Transform y Velocity.
   *
   * @param world - El mundo ECS que contiene las entidades.
   * @param deltaTime - Tiempo transcurrido desde el último tick en milisegundos.
   *
   * @contract La posición resultante es `p_new = p_old + (v * dt_seconds)`.
   * @invariant No modifica la velocidad de la entidad.
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
