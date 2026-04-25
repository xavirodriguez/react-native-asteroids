import { TransformComponent, PhysicsBody2DComponent } from "../types/EngineTypes";

/**
 * Interface mínima para objetos que representan una posición.
 */
interface PositionLike {
  x?: number;
  y?: number;
  worldX?: number;
  worldY?: number;
  [key: string]: unknown;
}

/**
 * Interface mínima para objetos que representan una velocidad.
 */
interface VelocityLike {
  dx?: number;
  dy?: number;
  velocityX?: number;
  velocityY?: number;
  [key: string]: unknown;
}

/**
 * Utilidades de integración física compartidas.
 * Diseñadas para fomentar la consistencia matemática entre los sistemas del motor y las predicciones de red.
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
   * @param pos - Objeto de posición (se espera que tenga x,y o worldX,worldY).
   * @param vel - Objeto de velocidad (se espera que tenga dx,dy o velocityX,velocityY).
   * @param deltaTimeInSeconds - Tiempo transcurrido en SEGUNDOS.
   *
   * @precondition Se espera que `deltaTimeInSeconds` sea un valor finito positivo.
   * @postcondition Las coordenadas `x`/`y` (o `worldX`/`worldY`) de `pos` son actualizadas.
   * @remarks No se espera que modifique el objeto `vel`.
   * @sideEffect Muta el objeto `pos` directamente por referencia.
   * @conceptualRisk [PRECISION_LOSS][LOW] La acumulación de errores de punto flotante en integraciones
   * largas puede causar divergencias mínimas entre clientes.
   */
  public static integrateMovement(pos: PositionLike, vel: VelocityLike, deltaTimeInSeconds: number): void {
    // Priority: local coordinates (x, y) over world coordinates (worldX, worldY)
    const hasLocal = pos.x !== undefined && pos.y !== undefined;
    const xKey = hasLocal ? "x" : "worldX";
    const yKey = hasLocal ? "y" : "worldY";

    // Priority: standard delta (dx, dy) over physics velocity (velocityX, velocityY)
    const hasDelta = vel.dx !== undefined && vel.dy !== undefined;
    const dxKey = hasDelta ? "dx" : "velocityX";
    const dyKey = hasDelta ? "dy" : "velocityY";

    const currentX = (pos[xKey] as number) || 0;
    const currentY = (pos[yKey] as number) || 0;
    const vx = (vel[dxKey] as number) || 0;
    const vy = (vel[dyKey] as number) || 0;

    (pos as Record<string, number>)[xKey] = currentX + vx * deltaTimeInSeconds;
    (pos as Record<string, number>)[yKey] = currentY + vy * deltaTimeInSeconds;
  }

  /**
   * Aplica amortiguación por fricción a la velocidad.
   * Soporta tanto componentes ECS estándar como objetos proxy.
   *
   * @remarks
   * Utiliza una función exponencial basada en el tiempo para favorecer que la fricción
   * se aplique de forma consistente independientemente del framerate.
   *
   * @param vel - Objeto de velocidad (estándar o proxy).
   * @param friction - Coeficiente de fricción (ej: 0.99).
   * @param deltaTimeMs - Tiempo transcurrido en milisegundos.
   *
   * @remarks
   * La amortiguación se aplica como una reducción de la velocidad buscando independencia de la tasa de frames.
   *
   * @precondition Se recomienda que `friction` esté en el rango [0, 1].
   * @sideEffect Muta el objeto `vel` directamente por referencia.
   */
  public static applyFriction(vel: VelocityLike, friction: number, deltaTimeMs: number): void {
    const dx = vel.dx !== undefined ? "dx" : "velocityX";
    const dy = vel.dy !== undefined ? "dy" : "velocityY";

    const dtFactor = deltaTimeMs / (1000 / 60);
    const frictionFactor = Math.pow(friction, dtFactor);
    if (vel[dx] !== undefined) (vel as Record<string, number>)[dx] = (vel[dx] as number) * frictionFactor;
    if (vel[dy] !== undefined) (vel as Record<string, number>)[dy] = (vel[dy] as number) * frictionFactor;
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

  /**
   * Actualiza las propiedades de masa e inercia de un cuerpo físico, buscando mantener las inversas en sincronía.
   *
   * @param body - El componente de cuerpo rígido a actualizar.
   * @param mass - La nueva masa (debería ser > 0 para cuerpos dinámicos).
   * @param inertia - El nuevo momento de inercia (debería ser > 0 para permitir rotación).
   *
   * @responsibility Mantener la sincronía de `inverseMass` e `inverseInertia` con la masa y la inercia.
   */
  public static updateBodyMassProperties(body: PhysicsBody2DComponent, mass: number, inertia: number): void {
    const mutableBody = body as { -readonly [K in keyof PhysicsBody2DComponent]: PhysicsBody2DComponent[K] };
    mutableBody.mass = mass;
    mutableBody.inverseMass = mass > 0 ? 1 / mass : 0;
    mutableBody.inertia = inertia;
    mutableBody.inverseInertia = inertia > 0 ? 1 / inertia : 0;
  }

  /**
   * Realiza la integración de un cuerpo rígido (Euler semi-implícito).
   *
   * @param transform - Componente de transformación.
   * @param body - Componente de cuerpo físico.
   * @param gravity - Gravedad actual ({x, y}).
   * @param dt - Delta time en segundos.
   *
   * @remarks
   * 1. Actualiza velocidades basadas en fuerzas acumuladas y gravedad.
   * 2. Actualiza posición y rotación basadas en la nueva velocidad.
   * 3. Resetea fuerzas y torque para el siguiente tick.
   *
   * @sideEffect Muta `transform` y `body`.
   */
  public static integrateRigidBody(
    transform: TransformComponent,
    body: PhysicsBody2DComponent,
    gravity: { x: number; y: number },
    dt: number
  ): void {
    if (body.bodyType === "static") return;

    // 1. Integrar velocidades (aceleración -> velocidad)
    if (body.bodyType === "dynamic") {
      body.velocityX += (body.forceX * body.inverseMass + gravity.x * body.gravityScale) * dt;
      body.velocityY += (body.forceY * body.inverseMass + gravity.y * body.gravityScale) * dt;

      if (!body.fixedRotation) {
        body.angularVelocity += (body.torque * body.inverseInertia) * dt;
      }
    }

    // 2. Integrar posiciones (velocidad -> posición)
    transform.x += body.velocityX * dt;
    transform.y += body.velocityY * dt;
    transform.rotation += body.angularVelocity * dt;

    // 3. Resetear fuerzas acumuladas
    body.forceX = 0;
    body.forceY = 0;
    body.torque = 0;
  }
}
