import { Ray } from "./QueryTypes";

export class RaycastTests {
  static rayVsCircle(ray: Ray, cx: number, cy: number, radius: number): { t: number, nx: number, ny: number } | null {
    const ocX = ray.originX - cx;
    const ocY = ray.originY - cy;
    const a = ray.directionX * ray.directionX + ray.directionY * ray.directionY;
    const b = 2 * (ocX * ray.directionX + ocY * ray.directionY);
    const c = ocX * ocX + ocY * ocY - radius * radius;
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return null;
    const t = (-b - Math.sqrt(discriminant)) / (2 * a);
    if (t >= 0 && t <= ray.maxDistance) {
      const hitX = ray.originX + ray.directionX * t;
      const hitY = ray.originY + ray.directionY * t;
      const nx = (hitX - cx) / radius;
      const ny = (hitY - cy) / radius;
      return { t, nx, ny };
    }
    return null;
  }

  static rayVsAABB(ray: Ray, ax: number, ay: number, halfW: number, halfH: number): { t: number, nx: number, ny: number } | null {
    let tmin = 0; let tmax = ray.maxDistance;
    const minX = ax - halfW; const maxX = ax + halfW;
    const minY = ay - halfH; const maxY = ay + halfH;
    if (Math.abs(ray.directionX) < 0.000001) {
      if (ray.originX < minX || ray.originX > maxX) return null;
    } else {
      const invD = 1 / ray.directionX;
      let t1 = (minX - ray.originX) * invD; let t2 = (maxX - ray.originX) * invD;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    }
    if (Math.abs(ray.directionY) < 0.000001) {
      if (ray.originY < minY || ray.originY > maxY) return null;
    } else {
      const invD = 1 / ray.directionY;
      let t1 = (minY - ray.originY) * invD; let t2 = (maxY - ray.originY) * invD;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    }
    if (tmin <= tmax && tmin >= 0 && tmin <= ray.maxDistance) {
      const hitX = ray.originX + ray.directionX * tmin;
      const hitY = ray.originY + ray.directionY * tmin;
      let nx = 0, ny = 0;
      if (Math.abs(hitX - minX) < 0.001) nx = -1;
      else if (Math.abs(hitX - maxX) < 0.001) nx = 1;
      else if (Math.abs(hitY - minY) < 0.001) ny = -1;
      else if (Math.abs(hitY - maxY) < 0.001) ny = 1;
      return { t: tmin, nx, ny };
    }
    return null;
  }

  static rayVsPolygon(ray: Ray, vertices: Array<{x: number, y: number}>, px: number, py: number, pr: number): { t: number, nx: number, ny: number } | null {
      // Ray vs Polygon: Ray cast against each edge
      let minT = Infinity;
      let hitNormal = { x: 0, y: 0 };
      const cos = Math.cos(pr); const sin = Math.sin(pr);

      for (let i = 0; i < vertices.length; i++) {
          const v1l = vertices[i]; const v2l = vertices[(i + 1) % vertices.length];
          const v1 = { x: px + (v1l.x * cos - v1l.y * sin), y: py + (v1l.x * sin + v1l.y * cos) };
          const v2 = { x: px + (v2l.x * cos - v2l.y * sin), y: py + (v2l.x * sin + v2l.y * cos) };

          const edgeX = v2.x - v1.x; const edgeY = v2.y - v1.y;
          const rayX = ray.directionX; const rayY = ray.directionY;
          const det = rayX * (-edgeY) - rayY * (-edgeX);
          if (Math.abs(det) < 0.000001) continue;

          const dx = v1.x - ray.originX; const dy = v1.y - ray.originY;
          const t = (dx * (-edgeY) - dy * (-edgeX)) / det;
          const u = (rayX * dy - rayY * dx) / det;

          if (t >= 0 && t <= ray.maxDistance && u >= 0 && u <= 1) {
              if (t < minT) {
                  minT = t;
                  const length = Math.sqrt(edgeX * edgeX + edgeY * edgeY);
                  hitNormal = { x: -edgeY / length, y: edgeX / length };
              }
          }
      }

      if (minT !== Infinity) return { t: minT, nx: hitNormal.x, ny: hitNormal.y };
      return null;
  }
}
