import { System } from "../core/System";
import { World } from "../core/World";
import { TTLComponent, ReclaimableComponent } from "../types/EngineTypes";

/**
 * Sistema responsable de gestionar el tiempo de vida (Time To Live) de las entidades.
 * Automatiza la destrucción de proyectiles, partículas o efectos temporales.
 *
 * @responsibility Decrementar el tiempo restante en {@link TTLComponent}.
 * @responsibility Destruir la entidad cuando el tiempo llega a cero.
 * @responsibility Notificar a los pools de reciclaje mediante {@link ReclaimableComponent}.
 *
 * @queries TTL
 * @mutates TTL.remaining, World (entity removal)
 * @emits onComplete
 * @executionOrder Fase: Simulation. Normalmente al final de la fase física.
 *
 * @remarks
 * El sistema invoca el callback `onComplete` definido en el componente antes de
 * proceder con la eliminación de la entidad del mundo.
 *
 * @contract Destrucción: Una entidad es eliminada SI Y SOLO SI `remaining <= 0`.
 * @invariant No modifica otros componentes de la entidad (e.g., Transform, Velocity).
 */
export class TTLSystem extends System {
  /**
   * Actualiza el tiempo de vida de las entidades.
   *
   * @param world - El mundo ECS.
   * @param deltaTime - Tiempo transcurrido en milisegundos.
   *
   * @precondition Las entidades deben poseer un {@link TTLComponent}.
   * @postcondition Se reduce `remaining`. Si llega a <= 0, la entidad es eliminada.
   */
  public update(world: World, deltaTime: number): void {
    const ttlEntities = world.query("TTL");

    for (let i = 0; i < ttlEntities.length; i++) {
      const entity = ttlEntities[i];
      const ttl = world.getComponent<TTLComponent>(entity, "TTL");
      if (ttl) {
        ttl.remaining -= deltaTime;
        if (ttl.remaining <= 0) {
          // Trigger onComplete callback if present
          if (ttl.onComplete) {
            ttl.onComplete();
          }

          // Notify pool before removal if reclaimable
          const reclaimable = world.getComponent<ReclaimableComponent>(entity, "Reclaimable");
          if (reclaimable) {
            reclaimable.onReclaim(world, entity);
          }

          world.removeEntity(entity);
        }
      }
    }
  }
}
