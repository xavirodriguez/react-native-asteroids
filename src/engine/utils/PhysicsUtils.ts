import { TransformComponent, VelocityComponent } from "../types/EngineTypes";

/**
 * Utilidades compartidas de integración física.
 *
 * @remarks
 * Centraliza la lógica matemática de movimiento y fricción para garantizar la paridad
 * entre los sistemas ECS del motor y las funciones de predicción/reconciliación en red.
 *
 * @responsibility Proporcionar funciones puras de integración física (Euler).
 * @packageDocumentation
 */
export class PhysicsUtils {
  /**
   * Aplica integración lineal para actualizar la posición basada en la velocidad.
   *
   * @remarks
   * Soporta tanto componentes estándar de ECS como objetos proxy o POJOs, manejando
   * polimorfismo entre coordenadas locales (`x`, `y`) y globales (`worldX`, `worldY`).
   *
   * @param pos - Objeto de posición (debe tener campos x/y o worldX/worldY).
   * @param vel - Objeto de velocidad (debe tener campos dx/dy o velocityX/velocityY).
   * @param deltaTimeInSeconds - Tiempo transcurrido en SEGUNDOS.
   *
   * @sideEffect Muta el objeto `pos` in-place.
   */
  public static integrateMovement(pos: any, vel: any, deltaTimeInSeconds: number): void {
    const x = pos.x !== undefined ? "x" : "worldX";
    const y = pos.y !== undefined ? "y" : "worldY";
    const dx = vel.dx !== undefined ? "dx" : "velocityX";
    const dy = vel.dy !== undefined ? "dy" : "velocityY";

    pos[x] += vel[dx] * deltaTimeInSeconds;
    pos[y] += vel[dy] * deltaTimeInSeconds;
  }

  /**
   * Aplica amortiguación de fricción a la velocidad.
   *
   * @remarks
   * Utiliza una fórmula de decaimiento exponencial para garantizar que la fricción
   * sea independiente de la tasa de refresco (framerate independent).
   *
   * @param vel - Objeto de velocidad (estándar o proxy).
   * @param friction - Coeficiente de fricción (e.g., 0.99 para 1% de pérdida por tick base).
   * @param deltaTimeMs - Tiempo transcurrido en milisegundos.
   *
   * @sideEffect Muta el objeto `vel` in-place.
   */
  public static applyFriction(vel: any, friction: number, deltaTimeMs: number): void {
    const dx = vel.dx !== undefined ? "dx" : "velocityX";
    const dy = vel.dy !== undefined ? "dy" : "velocityY";

    const dtFactor = deltaTimeMs / (1000 / 60);
    const frictionFactor = Math.pow(friction, dtFactor);
    vel[dx] *= frictionFactor;
    vel[dy] *= frictionFactor;
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
