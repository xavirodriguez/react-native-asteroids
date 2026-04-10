import { TransformComponent, VelocityComponent } from "../types/EngineTypes";

/**
 * Utilidades de integración física compartidas para asegurar la consistencia entre
 * los sistemas del motor y las predicciones a nivel de juego.
 *
 * @responsibility Proveer cálculos matemáticos estandarizados para movimiento y fricción.
 * @responsibility Soportar tanto componentes ECS estándar como objetos proxy para predicción.
 *
 * @remarks
 * Es vital que estas funciones sean puras o de efectos secundarios previsibles
 * para mantener el determinismo en entornos multijugador.
 */
export class PhysicsUtils {
  /**
   * Aplica integración lineal para actualizar la posición basada en la velocidad.
   * Soporta tanto componentes ECS estándar como objetos de estado simulados.
   *
   * @param pos - Objeto de posición (debe tener propiedades numéricas).
   * @param vel - Objeto de velocidad (debe tener propiedades numéricas).
   * @param deltaTimeInSeconds - Tiempo transcurrido expresado en segundos.
   *
   * @invariant Actualiza `worldX/worldY` si `x/y` no están definidos, soportando proxies de predicción.
   * @conceptualRisk [PRECISION][LOW] La integración de Euler es sensible a la tasa de fotogramas.
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
   * Aplica amortiguación por fricción a la velocidad.
   *
   * @param vel - Objeto de velocidad (estándar o proxy).
   * @param friction - Coeficiente de fricción (e.g., 0.99 para una pérdida del 1% por frame).
   * @param deltaTimeMs - Tiempo transcurrido en milisegundos.
   *
   * @remarks Utiliza una fórmula exponencial para garantizar que la fricción sea independiente
   * de la tasa de fotogramas (framerate-independent damping).
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
   * Teletransporta las coordenadas de una entidad al lado opuesto si sale de los límites.
   */
  public static wrapBoundary(pos: TransformComponent, width: number, height: number): void {
    if (pos.x < 0) pos.x = width;
    else if (pos.x > width) pos.x = 0;
    if (pos.y < 0) pos.y = height;
    else if (pos.y > height) pos.y = 0;
  }
}
