export interface CCDResult {
  hit: boolean;
  timeOfImpact: number;
  normalX: number;
  normalY: number;
  contactX: number;
  contactY: number;
}

const sharedResult: CCDResult = {
  hit: false,
  timeOfImpact: 1,
  normalX: 0,
  normalY: 0,
  contactX: 0,
  contactY: 0,
};

function resetResult(): CCDResult {
  sharedResult.hit = false;
  sharedResult.timeOfImpact = 1;
  sharedResult.normalX = 0;
  sharedResult.normalY = 0;
  sharedResult.contactX = 0;
  sharedResult.contactY = 0;
  return sharedResult;
}

/**
 * Utilidades para Continuous Collision Detection (CCD) mediante barrido lineal (Linear Sweeping).
 *
 * El CCD se utiliza para prevenir el "tunnelling", un fenómeno donde objetos que se mueven rápido
 * saltan a través de obstáculos entre pasos de simulación discretos. Estos algoritmos calculan
 * el Tiempo de Impacto exacto (TOI - Time of Impact) dentro de la duración de un frame.
 *
 * @remarks
 * - Asume velocidad lineal constante durante el frame (Integración de Euler).
 * - No tiene en cuenta el movimiento rotacional durante el barrido.
 * - Optimizado mediante el uso de objetos de resultado compartidos para reducir la presión sobre el GC.
 *
 * @packageDocumentation
 */
export class ContinuousCollision {
  /**
   * Predice la colisión entre un círculo en movimiento y un círculo estático.
   *
   * @remarks
   * Resuelve la ecuación cuadrática que representa la distancia entre los dos centros
   * a lo largo del tiempo: |(P_a + V_a * t) - P_b|^2 = (r_a + r_b)^2
   *
   * Donde:
   * - P_a es la posición inicial de A.
   * - V_a es el vector de movimiento (velocidad * deltaTime).
   * - P_b es la posición de B.
   * - t es el tiempo normalizado [0, 1].
   *
   * @conceptualRisk [TUNNELLING] Aunque CCD mitiga el tunnelling lineal, la falta de CCD rotacional
   * puede seguir causando fallos en objetos muy largos que rotan a alta velocidad.
   *
   * @param posAX - Initial X position of circle A.
   * @param posAY - Initial Y position of circle A.
   * @param velAX - Velocity X of circle A (units/ms).
   * @param velAY - Velocity Y of circle A (units/ms).
   * @param radiusA - Radius of circle A.
   * @param posBX - Constant X position of circle B.
   * @param posBY - Constant Y position of circle B.
   * @param radiusB - Radius of circle B.
   * @param deltaTime - Frame duration in milliseconds.
   * @returns CCDResult with hit status and timeOfImpact [0, 1].
   */
  static sweptCircleVsCircle(
    posAX: number, posAY: number, velAX: number, velAY: number, radiusA: number,
    posBX: number, posBY: number, radiusB: number,
    deltaTime: number
  ): CCDResult {
    const result = resetResult();
    const vx = velAX * deltaTime;
    const vy = velAY * deltaTime;
    const dx = posBX - posAX;
    const dy = posBY - posAY;
    const radiusSum = radiusA + radiusB;
    const radiusSumSq = radiusSum * radiusSum;

    // Check if already colliding at start of frame
    const distSq = dx * dx + dy * dy;
    if (distSq < radiusSumSq) {
      result.hit = true;
      result.timeOfImpact = 0;
      return result;
    }

    // Coeficientes de la ecuación cuadrática at^2 + bt + c = 0
    // Derivada de expandir la ecuación de distancia entre dos esferas en movimiento relativo.
    const a = vx * vx + vy * vy;
    if (a < 0.0001) return result; // Sin movimiento relativo apreciable

    const b = -2 * (vx * dx + vy * dy);
    const c = dx * dx + dy * dy - radiusSumSq;

    // El discriminante (b^2 - 4ac) determina si existen raíces reales (intersecciones).
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return result; // No hay intersección posible en la trayectoria

    // Calculamos el tiempo del primer impacto (la raíz más pequeña)
    // t = (-b - sqrt(D)) / 2a
    const t = (-b - Math.sqrt(discriminant)) / (2 * a);

    if (t >= 0 && t <= 1) {
      result.hit = true;
      result.timeOfImpact = t;

      // Calculate collision normal at time of impact
      const hitX = posAX + vx * t;
      const hitY = posAY + vy * t;
      const nx = hitX - posBX;
      const ny = hitY - posBY;
      const dist = Math.sqrt(nx * nx + ny * ny);

      result.normalX = nx / (dist || 1);
      result.normalY = ny / (dist || 1);
    }
    return result;
  }

  /**
   * Predicts collision between a moving circle and a static AABB.
   *
   * @remarks
   * Simplifies the problem by expanding the AABB by the circle's radius (Minkowski Sum)
   * and then performing a raycast against the expanded AABB.
   */
  static sweptCircleVsAABB(
    posAX: number, posAY: number, velAX: number, velAY: number, radiusA: number,
    posBX: number, posBY: number, halfWB: number, halfHB: number,
    deltaTime: number
  ): CCDResult {
    const result = resetResult();

    // Minkowski expansion of AABB by Circle radius
    const expandedHalfW = halfWB + radiusA;
    const expandedHalfH = halfHB + radiusA;

    const vx = velAX * deltaTime;
    const vy = velAY * deltaTime;
    const dx = posBX - posAX;
    const dy = posBY - posAY;

    let tmin = -Infinity;
    let tmax = Infinity;

    // Raycast against AABB on X axis
    if (vx !== 0) {
      const t1 = (-expandedHalfW + dx) / vx;
      const t2 = (expandedHalfW + dx) / vx;
      tmin = Math.max(tmin, Math.min(t1, t2));
      tmax = Math.min(tmax, Math.max(t1, t2));
    } else if (Math.abs(dx) > expandedHalfW) return result;

    // Raycast against AABB on Y axis
    if (vy !== 0) {
      const t1 = (-expandedHalfH + dy) / vy;
      const t2 = (expandedHalfH + dy) / vy;
      tmin = Math.max(tmin, Math.min(t1, t2));
      tmax = Math.min(tmax, Math.max(t1, t2));
    } else if (Math.abs(dy) > expandedHalfH) return result;

    if (tmax >= tmin && tmax >= 0 && tmin <= 1) {
      result.hit = true;
      result.timeOfImpact = Math.max(0, tmin);

      // Heuristic for normal determination based on hit coordinates relative to expanded AABB
      const hitX = -dx + vx * result.timeOfImpact;
      const hitY = -dy + vy * result.timeOfImpact;

      if (Math.abs(hitX - expandedHalfW) < 0.001) result.normalX = -1;
      else if (Math.abs(hitX + expandedHalfW) < 0.001) result.normalX = 1;
      else if (Math.abs(hitY - expandedHalfH) < 0.001) result.normalY = -1;
      else if (Math.abs(hitY + expandedHalfH) < 0.001) result.normalY = 1;
    }
    return result;
  }

  /**
   * Predicts collision between two AABBs.
   *
   * @remarks
   * Uses Minkowski difference to convert the AABB-vs-AABB sweep into a point-vs-AABB sweep.
   */
  static sweptAABBVsAABB(
      posAX: number, posAY: number, velAX: number, velAY: number, hwA: number, hhA: number,
      posBX: number, posBY: number, hwB: number, hhB: number,
      deltaTime: number
  ): CCDResult {
      const result = resetResult();
      const vx = velAX * deltaTime;
      const vy = velAY * deltaTime;
      const dx = posBX - posAX;
      const dy = posBY - posAY;

      // Combine dimensions of both AABBs
      const combinedHalfW = hwA + hwB;
      const combinedHalfH = hhA + hhB;

      let tmin = -Infinity;
      let tmax = Infinity;

      // Raycast on X axis
      if (vx !== 0) {
          const t1 = (-combinedHalfW + dx) / vx;
          const t2 = (combinedHalfW + dx) / vx;
          tmin = Math.max(tmin, Math.min(t1, t2));
          tmax = Math.min(tmax, Math.max(t1, t2));
      } else if (Math.abs(dx) > combinedHalfW) return result;

      // Raycast on Y axis
      if (vy !== 0) {
          const t1 = (-combinedHalfH + dy) / vy;
          const t2 = (combinedHalfH + dy) / vy;
          tmin = Math.max(tmin, Math.min(t1, t2));
          tmax = Math.min(tmax, Math.max(t1, t2));
      } else if (Math.abs(dy) > combinedHalfH) return result;

      if (tmax >= tmin && tmax >= 0 && tmin <= 1) {
          result.hit = true;
          result.timeOfImpact = Math.max(0, tmin);

          const hitX = -dx + vx * result.timeOfImpact;
          const hitY = -dy + vy * result.timeOfImpact;

          if (Math.abs(hitX - combinedHalfW) < 0.001) result.normalX = -1;
          else if (Math.abs(hitX + combinedHalfW) < 0.001) result.normalX = 1;
          else if (Math.abs(hitY - combinedHalfH) < 0.001) result.normalY = -1;
          else if (Math.abs(hitY + combinedHalfH) < 0.001) result.normalY = 1;
      }
      return result;
  }
}
