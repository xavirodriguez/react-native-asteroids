import { System } from "../core/System";
import { World } from "../core/World";
import { TransformComponent, VelocityComponent } from "../types/EngineTypes";
import { PhysicsUtils } from "../utils/PhysicsUtils";

/**
 * Sistema genérico encargado de actualizar las posiciones de las entidades basado en su velocidad.
 * Implementa un integrador lineal simple (Euler explicit).
 *
 * @responsibility Integrar la velocidad lineal y angular en la transformación para el tick actual.
 * @queries Transform, Velocity
 * @mutates Transform.x, Transform.y, Transform.rotation, Transform.dirty
 * @dependsOn {@link PhysicsUtils.integrateMovement}
 * @executionOrder Fase: {@link SystemPhase.Simulation}. Debe ejecutarse antes de Collision y Boundary.
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
   * Actualiza la posición y rotación de todas las entidades que poseen Transform y Velocity.
   *
   * @param world - El mundo ECS que contiene las entidades.
   * @param deltaTime - Tiempo transcurrido desde el último tick en milisegundos.
   *
   * @precondition Las entidades deben tener componentes {@link TransformComponent} y {@link VelocityComponent}.
   * @postcondition Las coordenadas `x`, `y` y `rotation` del `Transform` se actualizan.
   * @postcondition El flag `dirty` del `Transform` se marca como `true`.
   *
   * @contract La posición resultante es `p_new = p_old + (v * dt_seconds)`.
   * @invariant No modifica los componentes de velocidad de la entidad.
   */
  public update(world: World, deltaTime: number): void {
    const entities = world.query("Transform", "Velocity");
    const dtSeconds = deltaTime / 1000;

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const pos = world.getComponent<TransformComponent>(entity, "Transform");
      const vel = world.getComponent<VelocityComponent>(entity, "Velocity");

      if (pos && vel) {
        if (world.hasComponent(entity, "ManualMovement")) continue;
        PhysicsUtils.integrateMovement(pos, vel, dtSeconds);
      }
    }
  }
}
