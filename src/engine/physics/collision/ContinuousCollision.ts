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
 * Utilities for Continuous Collision Detection (CCD) using Linear Sweeping.
 *
 * CCD prevents "tunneling"—a phenomenon where fast-moving objects skip over
 * obstacles between discrete simulation steps. These algorithms calculate the
 * exact Time of Impact (TOI) within a frame's duration.
 *
 * @remarks
 * ### Mathematical Basis:
 * - Assumes constant linear velocity (Euler integration).
 * - Ignores rotational movement during the sweep.
 * - Optimized with shared result objects to minimize GC pressure.
 *
 * @packageDocumentation
 */
export class ContinuousCollision {
  /**
   * Predicts collision between a moving circle and a static circle.
   *
   * @remarks
   * Solves the quadratic equation for the distance between centers:
   * `|(Pa + Va*t) - Pb|^2 = (ra + rb)^2`
   *
   * Let `D = Pa - Pb` (relative distance) and `V = Va` (relative velocity).
   * Expanding `(D + V*t) · (D + V*t) = R^2`:
   * `(V·V)t^2 + 2(V·D)t + (D·D - R^2) = 0`
   *
   * Coefficients:
   * - `a = V·V` (Square of relative speed)
   * - `b = 2(V·D)`
   * - `c = D·D - R^2` (Initial separation squared minus radius sum squared)
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

    // El discriminante (b^2 - 4ac) de la ecuación cuadrática determina si existen raíces reales.
    // D < 0 significa que los círculos nunca llegan a tocarse en sus trayectorias lineales.
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return result;

    // Calculamos el tiempo del primer impacto resolviendo para 't' usando la fórmula cuadrática.
    // Buscamos la raíz más pequeña (primer contacto) en el intervalo [0, 1].
    // t = (-b - sqrt(discriminant)) / 2a
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
   * Utilizes the Minkowski Sum principle:
   * 1. Expands the target AABB by the radius of the moving circle.
   * 2. This reduces the problem to a raycast (line segment) against the expanded AABB.
   * 3. Calculates the entry time (`tmin`) and exit time (`tmax`) for the ray.
   * 4. If `tmax >= tmin` and `tmin` is within [0, 1], an impact occurs.
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
   * Employs the Minkowski Difference:
   * 1. Creates a new AABB whose dimensions are the sum of both input AABBs.
   * 2. This reduces the problem to checking if a ray (relative velocity vector)
   *    intersects this combined AABB.
   * 3. Uses the Slab Method (intersecting intervals) to find the entry time `tmin`.
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
