import { System } from "../core/System";
import { World } from "../core/World";
/**
 * Sistema universal de límites que gestiona el teletransporte (wrap), rebote (bounce)
 * o destrucción de entidades cuando salen de los límites de pantalla definidos.
 *
 * @responsibility Mantener las entidades dentro del área de juego o destruirlas si salen.
 * @queries Transform, Boundary
 * @mutates Transform, Velocity, World (Entity removal)
 * @dependsOn {@link PhysicsUtils.wrapBoundary}
 * @executionOrder Fase: Simulation. Debe ejecutarse después de MovementSystem.
 *
 * @remarks
 * Este sistema garantiza que ninguna entidad con {@link BoundaryComponent} se pierda fuera del área de
 * juego. Es esencial para proyectiles con TTL y para el movimiento cíclico en Asteroids.
 *
 * @contract Wrap: Si `x > width`, `x = 0` y viceversa. Mismo comportamiento para `y` y `height`.
 * @contract Bounce: Invierte el componente de velocidad correspondiente y mantiene la entidad en el borde.
 * @contract Destroy: Elimina la entidad invocando su pool de reciclaje si existe.
 *
 * @conceptualRisk [DRIFT][MEDIUM] La lógica de `bounce` está implementada localmente en lugar de usar
 * `PhysicsUtils`, lo que puede causar discrepancias con otros sistemas físicos centralizados.
 * @conceptualRisk [UNCLEAR] El uso de `boundary.mode` como fallback de `boundary.behavior` sugiere
 * una migración de API incompleta o falta de estandarización en `BoundaryComponent`.
 */
export declare class BoundarySystem extends System {
    update(world: World, deltaTime: number): void;
    private applyBoundary;
    private wrap;
    private bounce;
    private destroy;
}
