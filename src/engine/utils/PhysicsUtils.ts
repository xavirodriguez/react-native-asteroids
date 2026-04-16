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
  public static integrateMovement(pos: Record<string, any>, vel: Record<string, any>, deltaTimeInSeconds: number): void {
    const x = pos.x !== undefined ? "x" : "worldX";
    const y = pos.y !== undefined ? "y" : "worldY";
    const dx = vel.dx !== undefined ? "dx" : "velocityX";
    const dy = vel.dy !== undefined ? "dy" : "velocityY";

    pos[x] = ((pos[x] as number) || 0) + ((vel[dx] as number) || 0) * deltaTimeInSeconds;
    pos[y] = ((pos[y] as number) || 0) + ((vel[dy] as number) || 0) * deltaTimeInSeconds;
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
  public static applyFriction(vel: Record<string, any>, friction: number, deltaTimeMs: number): void {
    const dx = vel.dx !== undefined ? "dx" : "velocityX";
    const dy = vel.dy !== undefined ? "dy" : "velocityY";

    const dtFactor = deltaTimeMs / (1000 / 60);
    const frictionFactor = Math.pow(friction, dtFactor);
    if (vel[dx] !== undefined) vel[dx] = (vel[dx] as number) * frictionFactor;
    if (vel[dy] !== undefined) vel[dy] = (vel[dy] as number) * frictionFactor;
  }

  /**
   * Wraps coordinates around a screen boundary.
   */
  public static wrapBoundary(pos: TransformComponent, width: number, height: number, minX: number = 0, minY: number = 0): void {
    const maxX = minX + width;
    const maxY = minY + height;

    if (pos.x < minX) pos.x = maxX;
    else if (pos.x > maxX) pos.x = minX;
    if (pos.y < minY) pos.y = maxY;
    else if (pos.y > maxY) pos.y = minY;
  }

  /**
   * Bounces an entity off screen boundaries.
   */
  public static bounceBoundary(
    pos: TransformComponent,
    vel: import("../core/CoreComponents").VelocityComponent,
    width: number,
    height: number,
    minX: number = 0,
    minY: number = 0,
    bounceX: boolean = true,
    bounceY: boolean = true
  ): void {
    const maxX = minX + width;
    const maxY = minY + height;

    if (bounceX) {
      if (pos.x < minX) {
        pos.x = minX;
        vel.dx *= -1;
      } else if (pos.x > maxX) {
        pos.x = maxX;
        vel.dx *= -1;
      }
    }

    if (bounceY) {
      if (pos.y < minY) {
        pos.y = minY;
        vel.dy *= -1;
      } else if (pos.y > maxY) {
        pos.y = maxY;
        vel.dy *= -1;
      }
    }
  }
}
