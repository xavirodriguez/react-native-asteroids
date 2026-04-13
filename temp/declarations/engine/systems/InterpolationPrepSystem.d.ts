import { System } from "../core/System";
import { World } from "../core/World";
/**
 * Sistema que captura el estado de transformación actual antes de que sea modificado por la simulación.
 *
 * @responsibility Almacenar la posición y rotación del tick anterior en {@link PreviousTransformComponent}.
 * @queries Transform
 * @mutates PreviousTransform
 * @executionOrder Fase: Input o Simulation (al inicio). Debe ejecutarse antes de cualquier sistema que mueva entidades.
 *
 * @remarks
 * Este sistema es fundamental para el renderizado suave. Los datos capturados aquí son utilizados
 * por los renderizadores (Canvas/Skia) para interpolar posiciones entre ticks físicos fijos.
 */
export declare class InterpolationPrepSystem extends System {
    /**
     * Captura el estado actual del Transform en PreviousTransform.
     *
     * @param world - El mundo ECS.
     * @param _deltaTime - Tiempo transcurrido (ignorado).
     *
     * @precondition Debe ejecutarse al inicio del frame, antes de cualquier mutación de simulación.
     * @postcondition El componente `PreviousTransform` de cada entidad contiene los datos de la
     * posición previa a la simulación del frame actual.
     * @sideEffect Crea el componente `PreviousTransform` si no existía previamente.
     */
    update(world: World, _deltaTime: number): void;
}
