import { System } from "../core/System";
import { World } from "../core/World";
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
export declare class TTLSystem extends System {
    update(world: World, deltaTime: number): void;
}
