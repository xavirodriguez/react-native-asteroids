import { TransformComponent } from "../types/EngineTypes";
/**
 * Utilidades de integración física compartidas.
 * Garantiza la consistencia matemática entre los sistemas del motor y las predicciones de red.
 *
 * @responsibility Proveer algoritmos de integración estándar (Euler/Damping).
 * @responsibility Centralizar el manejo de unidades (milisegundos vs segundos).
 *
 * @remarks
 * Es crítico que tanto los `Systems` como el código de predicción en el cliente usen
 * estas utilidades para evitar el "Implementation Drift" que causa desincronizaciones.
 */
export declare class PhysicsUtils {
    /**
     * Aplica integración lineal para actualizar la posición basada en la velocidad.
     * Soporta tanto componentes ECS estándar como objetos proxy (para predicción).
     *
     * @param pos - Objeto de posición (debe tener x,y o worldX,worldY).
     * @param vel - Objeto de velocidad (debe tener dx,dy o velocityX,velocityY).
     * @param deltaTimeInSeconds - Tiempo transcurrido en SEGUNDOS.
     *
     * @precondition `deltaTimeInSeconds` debe ser un valor finito positivo.
     * @postcondition Las coordenadas `x`/`y` (o `worldX`/`worldY`) de `pos` son actualizadas.
     * @invariant No debe modificar el objeto `vel`.
     * @sideEffect Muta el objeto `pos` directamente por referencia.
     * @conceptualRisk [PRECISION_LOSS][LOW] La acumulación de errores de punto flotante en integraciones
     * largas puede causar divergencias mínimas entre clientes.
     */
    static integrateMovement(pos: any, vel: any, deltaTimeInSeconds: number): void;
    /**
     * Aplica amortiguación por fricción a la velocidad.
     * Soporta tanto componentes ECS estándar como objetos proxy.
     *
     * @remarks
     * Utiliza una función exponencial basada en el tiempo para garantizar que la fricción
     * se aplique de forma consistente independientemente del framerate.
     *
     * @param vel - Objeto de velocidad (estándar o proxy).
     * @param friction - Coeficiente de fricción (ej: 0.99).
     * @param deltaTimeMs - Tiempo transcurrido en milisegundos.
     *
     * @precondition `friction` debe estar en el rango [0, 1].
     * @postcondition Los componentes `dx`/`dy` de `vel` son reducidos.
     * @sideEffect Muta el objeto `vel` directamente por referencia.
     */
    static applyFriction(vel: any, friction: number, deltaTimeMs: number): void;
    /**
     * Wraps coordinates around a screen boundary.
     */
    static wrapBoundary(pos: TransformComponent, width: number, height: number): void;
}
