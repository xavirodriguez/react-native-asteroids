import { TransformComponent, VelocityComponent } from "../types/EngineTypes";

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
   * @invariant No debe modificar el objeto `vel`.
   * @conceptualRisk [PRECISION_LOSS] La acumulación de errores de punto flotante en integraciones
   * largas puede causar divergencias mínimas entre clientes.
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
   * Applies friction damping to velocity.
   * Supports both standard ECS components and proxy objects.
   * @param vel - Velocity object (standard or proxy)
   * @param friction - The friction coefficient (e.g., 0.99)
   * @param deltaTimeMs - Elapsed time in milliseconds.
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
