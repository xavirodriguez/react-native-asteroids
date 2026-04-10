import { System } from "../core/System";
import { World } from "../core/World";
import { TTLComponent, ReclaimableComponent } from "../types/EngineTypes";

/**
 * Sistema responsable de gestionar el tiempo de vida (Time To Live) de las entidades.
 * Elimina automáticamente las entidades cuando su tiempo de vida expira.
 *
 * @responsibility Decrementar el temporizador de vida de las entidades.
 * @responsibility Disparar callbacks de finalización y reciclar entidades mediante pools.
 * @queries TTL
 * @mutates TTL, World (Entity removal)
 * @executionOrder Fase: Simulation o GameRules.
 *
 * @conceptualRisk [CALLBACK_SIDE_EFFECTS][MEDIUM] El callback `onComplete` puede realizar
 * mutaciones estructurales en el mundo durante la iteración del sistema.
 */
export class TTLSystem extends System {
  /**
   * Actualiza el tiempo restante de todas las entidades con TTLComponent.
   *
   * @param world - El mundo ECS.
   * @param deltaTime - Tiempo transcurrido en milisegundos.
   *
   * @invariant Una entidad con `remaining <= 0` es eliminada del mundo en el tick actual.
   */
  public update(world: World, deltaTime: number): void {
    const ttlEntities = world.query("TTL");

    ttlEntities.forEach((entity) => {
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
    });
  }
}
