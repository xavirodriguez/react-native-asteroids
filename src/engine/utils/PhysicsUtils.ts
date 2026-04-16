import { TransformComponent, Component } from "../types/EngineTypes";

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
export class PhysicsUtils {
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
  public static integrateMovement(
    pos: TransformComponent | { x: number; y: number } | { worldX: number; worldY: number },
    vel: import("../core/CoreComponents").VelocityComponent | { dx: number; dy: number } | { velocityX: number; velocityY: number },
    deltaTimeInSeconds: number
  ): void {
    const p = pos as Record<string, unknown>;
    const v = vel as Record<string, unknown>;

    const x = p.x !== undefined ? "x" : "worldX";
    const y = p.y !== undefined ? "y" : "worldY";
    const dx = v.dx !== undefined ? "dx" : "velocityX";
    const dy = v.dy !== undefined ? "dy" : "velocityY";

    (p as Record<string, number>)[x] = ((p[x] as number) || 0) + ((v[dx] as number) || 0) * deltaTimeInSeconds;
    (p as Record<string, number>)[y] = ((p[y] as number) || 0) + ((v[dy] as number) || 0) * deltaTimeInSeconds;
  }

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
  public static applyFriction(
    vel: import("../core/CoreComponents").VelocityComponent | { dx: number; dy: number } | { velocityX: number; velocityY: number },
    friction: number,
    deltaTimeMs: number
  ): void {
    const v = vel as Record<string, unknown>;
    const dx = v.dx !== undefined ? "dx" : "velocityX";
    const dy = v.dy !== undefined ? "dy" : "velocityY";

    const dtFactor = deltaTimeMs / (1000 / 60);
    const frictionFactor = Math.pow(friction, dtFactor);
    if (v[dx] !== undefined) (v as Record<string, number>)[dx] = (v[dx] as number) * frictionFactor;
    if (v[dy] !== undefined) (v as Record<string, number>)[dy] = (v[dy] as number) * frictionFactor;
  }

  /**
   * Wraps coordinates around a screen boundary.
   */
  public static wrapBoundary(pos: TransformComponent, width: number, height: number): void {
    if (pos.x < 0) pos.x = width;
    else if (pos.x > width) pos.x = 0;
    if (pos.y < 0) pos.y = height;
    else if (pos.y > height) pos.y = 0;
  }
}
