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
 * Utilidades para la detección de colisiones continuas (CCD) mediante barrido lineal.
 *
 * @remarks
 * Estas utilidades están destinadas a predecir colisiones entre ticks de simulación
 * basándose en la velocidad lineal relativa, ayudando a reducir el efecto de "tunneling".
 * Los algoritmos asumen trayectorias lineales constantes durante el frame y no consideran
 * la rotación de las formas durante el barrido.
 */
export class ContinuousCollision {
  static sweptCircleVsCircle(
    posAX: number, posAY: number, velAX: number, velAY: number, radiusA: number,
    posBX: number, posBY: number, radiusB: number,
    deltaTime: number
  ): CCDResult {
    const result = resetResult();
    const vx = velAX * deltaTime; const vy = velAY * deltaTime;
    const dx = posBX - posAX; const dy = posBY - posAY;
    const radiusSum = radiusA + radiusB;
    const radiusSumSq = radiusSum * radiusSum;
    const distSq = dx * dx + dy * dy;
    if (distSq < radiusSumSq) { result.hit = true; result.timeOfImpact = 0; return result; }
    const a = vx * vx + vy * vy;
    if (a < 0.0001) return result;
    const b = -2 * (vx * dx + vy * dy);
    const c = dx * dx + dy * dy - radiusSumSq;
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return result;
    const t = (-b - Math.sqrt(discriminant)) / (2 * a);
    if (t >= 0 && t <= 1) {
      result.hit = true; result.timeOfImpact = t;
      const hitX = posAX + vx * t; const hitY = posAY + vy * t;
      const nx = hitX - posBX; const ny = hitY - posBY;
      const dist = Math.sqrt(nx * nx + ny * ny);
      result.normalX = nx / dist; result.normalY = ny / dist;
    }
    return result;
  }

  static sweptCircleVsAABB(
    posAX: number, posAY: number, velAX: number, velAY: number, radiusA: number,
    posBX: number, posBY: number, halfWB: number, halfHB: number,
    deltaTime: number
  ): CCDResult {
    const result = resetResult();
    const expandedHalfW = halfWB + radiusA;
    const expandedHalfH = halfHB + radiusA;
    const vx = velAX * deltaTime; const vy = velAY * deltaTime;
    const dx = posBX - posAX; const dy = posBY - posAY;
    let tmin = -Infinity; let tmax = Infinity;
    if (vx !== 0) {
      const t1 = (-expandedHalfW + dx) / vx; const t2 = (expandedHalfW + dx) / vx;
      tmin = Math.max(tmin, Math.min(t1, t2)); tmax = Math.min(tmax, Math.max(t1, t2));
    } else if (Math.abs(dx) > expandedHalfW) return result;
    if (vy !== 0) {
      const t1 = (-expandedHalfH + dy) / vy; const t2 = (expandedHalfH + dy) / vy;
      tmin = Math.max(tmin, Math.min(t1, t2)); tmax = Math.min(tmax, Math.max(t1, t2));
    } else if (Math.abs(dy) > expandedHalfH) return result;
    if (tmax >= tmin && tmax >= 0 && tmin <= 1) {
      result.hit = true; result.timeOfImpact = Math.max(0, tmin);
      const hitX = -dx + vx * result.timeOfImpact; const hitY = -dy + vy * result.timeOfImpact;
      if (Math.abs(hitX - expandedHalfW) < 0.001) result.normalX = -1;
      else if (Math.abs(hitX + expandedHalfW) < 0.001) result.normalX = 1;
      else if (Math.abs(hitY - expandedHalfH) < 0.001) result.normalY = -1;
      else if (Math.abs(hitY + expandedHalfH) < 0.001) result.normalY = 1;
    }
    return result;
  }

  static sweptAABBVsAABB(
      posAX: number, posAY: number, velAX: number, velAY: number, hwA: number, hhA: number,
      posBX: number, posBY: number, hwB: number, hhB: number,
      deltaTime: number
  ): CCDResult {
      const result = resetResult();
      const vx = velAX * deltaTime; const vy = velAY * deltaTime;
      const dx = posBX - posAX; const dy = posBY - posAY;
      const combinedHalfW = hwA + hwB; const combinedHalfH = hhA + hhB;

      let tmin = -Infinity; let tmax = Infinity;
      if (vx !== 0) {
          const t1 = (-combinedHalfW + dx) / vx; const t2 = (combinedHalfW + dx) / vx;
          tmin = Math.max(tmin, Math.min(t1, t2)); tmax = Math.min(tmax, Math.max(t1, t2));
      } else if (Math.abs(dx) > combinedHalfW) return result;
      if (vy !== 0) {
          const t1 = (-combinedHalfH + dy) / vy; const t2 = (combinedHalfH + dy) / vy;
          tmin = Math.max(tmin, Math.min(t1, t2)); tmax = Math.min(tmax, Math.max(t1, t2));
      } else if (Math.abs(dy) > combinedHalfH) return result;

      if (tmax >= tmin && tmax >= 0 && tmin <= 1) {
          result.hit = true; result.timeOfImpact = Math.max(0, tmin);
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
