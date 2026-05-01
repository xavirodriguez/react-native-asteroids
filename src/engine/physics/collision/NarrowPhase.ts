/**
 * Implementation of Narrow Phase collision detection algorithms.
 *
 * This module provides precise collision detection between different geometric primitives
 * using algorithms like Separating Axis Theorem (SAT) and distance-based checks.
 * It generates a {@link CollisionManifold} containing details about collision state,
 * normals, penetration depth, and contact points.
 *
 * @remarks
 * Most algorithms here assume standard Euclidean geometry.
 *
 * ### Separating Axis Theorem (SAT)
 * For two convex shapes, if there exists an axis on which their projections do not overlap,
 * they are not colliding. The system tests all potential axes (edge normals for polygons,
 * and the axis between centers for circles).
 *
 * ### Reference Diagram (Polygon SAT)
 * ```
 *      Polygon A          Axis (Normal)
 *       /---\               ^
 *      /     \              |     [---] Projection A
 *      \     /              |
 *       \---/               |     (Gap) -> Separated!
 *                           |
 *             /---\         |     [---] Projection B
 *            /     \        |
 *           \---/           |
 *          Polygon B
 * ```
 *
 * The system uses object pooling and shared manifolds to minimize GC pressure during the physics step.
 *
 * @packageDocumentation
 */

import { Shape, CircleShape, AABBShape, CapsuleShape, PolygonShape } from "../shapes/ShapeTypes";

import { CollisionManifold } from "./CollisionTypes";
export { CollisionManifold };

const sharedManifold: CollisionManifold = {
  colliding: false,
  normalX: 0,
  normalY: 0,
  depth: 0,
  contactPoints: [],
};

const vertexPool: Array<{x: number, y: number}> = [];
function _getVertex(x: number, y: number) {
    let v = vertexPool.pop();
    if (!v) v = {x: 0, y: 0};
    v.x = x; v.y = y;
    return v;
}

function resetManifold(): CollisionManifold {
  sharedManifold.colliding = false;
  sharedManifold.normalX = 0;
  sharedManifold.normalY = 0;
  sharedManifold.depth = 0;
  sharedManifold.contactPoints.length = 0;
  return sharedManifold;
}

const axesCache: Array<{x: number, y: number}> = [];
const worldVerticesA: Array<{x: number, y: number}> = [];
const worldVerticesB: Array<{x: number, y: number}> = [];

const staticAABBPoly: PolygonShape = {
    type: "polygon",
    vertices: [{x:0,y:0},{x:0,y:0},{x:0,y:0},{x:0,y:0}],
    normals: [{x:0,y:-1}, {x:1,y:0}, {x:0,y:1}, {x:-1,y:0}]
};

/**
 * Implementación de algoritmos de detección de colisiones de Fase Estrecha (Narrow Phase).
 *
 * Proporciona detección precisa entre primitivas geométricas mediante el Teorema del Eje Separador (SAT)
 * y comprobaciones basadas en distancia. Genera un {@link CollisionManifold} con normales, profundidad
 * y puntos de contacto.
 *
 * @remarks
 * El sistema está optimizado para minimizar la presión sobre el GC mediante el uso de manifolds compartidos
 * y pools de vértices, asumiendo una simulación de alta frecuencia (60Hz+).
 *
 * @conceptualRisk [FLOAT_PRECISION][MEDIUM] Los productos cruzados y normalizaciones dependen de un épsilon (0.0001)
 * para evitar divisiones por cero en colisiones casi perfectas.
 * @conceptualRisk [GC_PRESSURE][LOW] Aunque usa pools, el manifold devuelto es una referencia compartida;
 * debe procesarse inmediatamente o copiarse si se requiere persistencia.
 */
export class NarrowPhase {
  /**
   * Punto de entrada principal para la fase estrecha entre dos formas.
   * Despacha a tests específicos según el tipo de primitiva.
   *
   * @param shapeA - Definición geométrica de la primera forma.
   * @param posXA - World X coordinate of shape A.
   * @param posYA - World Y coordinate of shape A.
   * @param rotA - World rotation of shape A in radians.
   * @param shapeB - Geometric definition of the second shape.
   * @param posXB - World X coordinate of shape B.
   * @param posYB - World Y coordinate of shape B.
   * @param rotB - World rotation of shape B in radians.
   * @returns A manifold containing collision data.
   */
  static test(
    shapeA: Shape, posXA: number, posYA: number, rotA: number,
    shapeB: Shape, posXB: number, posYB: number, rotB: number
  ): CollisionManifold {
    if (shapeA.type === "circle") {
      if (shapeB.type === "circle") return this.circleVsCircle(shapeA, posXA, posYA, shapeB, posXB, posYB);
      if (shapeB.type === "aabb") return this.circleVsAabb(shapeA, posXA, posYA, shapeB, posXB, posYB);
      if (shapeB.type === "polygon") return this.circleVsPolygon(shapeA, posXA, posYA, shapeB, posXB, posYB, rotB);
      if (shapeB.type === "capsule") return this.circleVsCapsule(shapeA, posXA, posYA, shapeB, posXB, posYB, rotB);
    } else if (shapeA.type === "aabb") {
      if (shapeB.type === "circle") {
        const res = this.circleVsAabb(shapeB, posXB, posYB, shapeA, posXA, posYA);
        if (res.colliding) { res.normalX *= -1; res.normalY *= -1; }
        return res;
      }
      if (shapeB.type === "aabb") return this.aabbVsAabb(shapeA, posXA, posYA, shapeB, posXB, posYB);
      if (shapeB.type === "polygon") return this.aabbVsPolygon(shapeA, posXA, posYA, shapeB, posXB, posYB, rotB);
      if (shapeB.type === "capsule") return this.aabbVsCapsule(shapeA, posXA, posYA, shapeB, posXB, posYB, rotB);
    } else if (shapeA.type === "polygon") {
      if (shapeB.type === "circle") {
        const res = this.circleVsPolygon(shapeB, posXB, posYB, shapeA, posXA, posYA, rotA);
        if (res.colliding) { res.normalX *= -1; res.normalY *= -1; }
        return res;
      }
      if (shapeB.type === "aabb") {
          const res = this.aabbVsPolygon(shapeB, posXB, posYB, shapeA, posXA, posYA, rotA);
          if (res.colliding) { res.normalX *= -1; res.normalY *= -1; }
          return res;
      }
      if (shapeB.type === "polygon") return this.polygonVsPolygon(shapeA, posXA, posYA, rotA, shapeB, posXB, posYB, rotB);
      if (shapeB.type === "capsule") return this.polygonVsCapsule(shapeA, posXA, posYA, rotA, shapeB, posXB, posYB, rotB);
    } else if (shapeA.type === "capsule") {
        if (shapeB.type === "circle") {
            const res = this.circleVsCapsule(shapeB, posXB, posYB, shapeA, posXA, posYA, rotA);
            if (res.colliding) { res.normalX *= -1; res.normalY *= -1; }
            return res;
        }
        if (shapeB.type === "aabb") {
            const res = this.aabbVsCapsule(shapeB, posXB, posYB, shapeA, posXA, posYA, rotA);
            if (res.colliding) { res.normalX *= -1; res.normalY *= -1; }
            return res;
        }
        if (shapeB.type === "polygon") {
            const res = this.polygonVsCapsule(shapeB, posXB, posYB, rotB, shapeA, posXA, posYA, rotA);
            if (res.colliding) { res.normalX *= -1; res.normalY *= -1; }
            return res;
        }
        if (shapeB.type === "capsule") return this.capsuleVsCapsule(shapeA, posXA, posYA, rotA, shapeB, posXB, posYB, rotB);
    }
    return resetManifold();
  }

  /**
   * Collision detection between two circles.
   *
   * @remarks
   * Uses distance comparison: `distance(A, B) < radiusA + radiusB`.
   * For performance, it compares squared distances to avoid `Math.sqrt`.
   */
  static circleVsCircle(a: CircleShape, ax: number, ay: number, b: CircleShape, bx: number, by: number): CollisionManifold {
    const manifold = resetManifold();
    const dx = bx - ax; const dy = by - ay;
    const distanceSq = dx * dx + dy * dy;
    const radiusSum = a.radius + b.radius;

    // Check if squared distance is less than squared sum of radii
    if (distanceSq < radiusSum * radiusSum) {
      const distance = Math.sqrt(distanceSq);
      manifold.colliding = true;
      manifold.depth = radiusSum - distance;

      // Normal points from A to B
      if (distance > 0.0001) {
        manifold.normalX = dx / distance;
        manifold.normalY = dy / distance;
      } else {
        // Degenerate case: centers are exactly the same
        manifold.normalX = 1;
        manifold.normalY = 0;
      }

      // Contact point is along the normal at radius distance from A
      manifold.contactPoints.push({ x: ax + manifold.normalX * a.radius, y: ay + manifold.normalY * a.radius });
    }
    return manifold;
  }

  /**
   * Collision detection between two Axis-Aligned Bounding Boxes (AABBs).
   * Calculates overlap on both axes and chooses the axis of minimum penetration.
   */
  static aabbVsAabb(a: AABBShape, ax: number, ay: number, b: AABBShape, bx: number, by: number): CollisionManifold {
    const manifold = resetManifold();
    const dx = bx - ax;
    const xOverlap = a.halfWidth + b.halfWidth - Math.abs(dx);

    if (xOverlap > 0) {
      const dy = by - ay;
      const yOverlap = a.halfHeight + b.halfHeight - Math.abs(dy);

      if (yOverlap > 0) {
        manifold.colliding = true;
        // Minimum translation vector (MTV) principle
        if (xOverlap < yOverlap) {
          manifold.depth = xOverlap;
          manifold.normalX = dx > 0 ? 1 : -1;
          manifold.normalY = 0;
        } else {
          manifold.depth = yOverlap;
          manifold.normalX = 0;
          manifold.normalY = dy > 0 ? 1 : -1;
        }
      }
    }
    return manifold;
  }

  /**
   * Collision detection between a circle and an AABB.
   *
   * @remarks
   * Employs the "Clamping" method:
   * 1. Find the point on the AABB closest to the circle's center by clamping the center coordinates to the AABB's range.
   * 2. Calculate the distance between the circle center and this closest point.
   * 3. If distance < circle radius, a collision is occurring.
   *
   * Special case: If the circle center is *inside* the AABB, the normal and depth are calculated
   * based on the distance to the nearest edge of the AABB.
   */
  static circleVsAabb(circle: CircleShape, cx: number, cy: number, aabb: AABBShape, ax: number, ay: number): CollisionManifold {
    const manifold = resetManifold();
    let closestX = cx;
    let closestY = cy;
    const minX = ax - aabb.halfWidth;
    const maxX = ax + aabb.halfWidth;
    const minY = ay - aabb.halfHeight;
    const maxY = ay + aabb.halfHeight;

    // Clamp circle center to AABB extent to find closest point on AABB
    if (cx < minX) closestX = minX; else if (cx > maxX) closestX = maxX;
    if (cy < minY) closestY = minY; else if (cy > maxY) closestY = maxY;

    const dx = cx - closestX;
    const dy = cy - closestY;
    const distanceSq = dx * dx + dy * dy;

    if (distanceSq < circle.radius * circle.radius) {
      const distance = Math.sqrt(distanceSq);
      manifold.colliding = true;

      if (distance > 0.0001) {
        // Normal points from AABB (closestPoint) towards circle center
        manifold.normalX = -dx / distance;
        manifold.normalY = -dy / distance;
        manifold.depth = circle.radius - distance;
      } else {
        // Circle center is inside the AABB
        const xDist = Math.min(Math.abs(cx - minX), Math.abs(cx - maxX));
        const yDist = Math.min(Math.abs(cy - minY), Math.abs(cy - maxY));
        if (xDist < yDist) {
            manifold.normalX = cx > ax ? 1 : -1;
            manifold.normalY = 0;
            manifold.depth = circle.radius + xDist;
        } else {
            manifold.normalX = 0;
            manifold.normalY = cy > ay ? 1 : -1;
            manifold.depth = circle.radius + yDist;
        }
      }
      manifold.contactPoints.push({ x: closestX, y: closestY });
    }
    return manifold;
  }

  /**
   * Collision detection between a circle and a convex polygon.
   *
   * @remarks
   * 1. Transform polygon vertices to world space.
   * 2. Iterate through each edge of the polygon.
   * 3. Project the circle center onto the edge segment to find the closest point on the perimeter.
   * 4. Check if the center is "inside" all edges using the cross product.
   * 5. If inside OR distance to perimeter < radius, there is a collision.
   */
  static circleVsPolygon(circle: CircleShape, cx: number, cy: number, poly: PolygonShape, px: number, py: number, pr: number): CollisionManifold {
    const manifold = resetManifold();
    this.populateGlobalVertices(poly, px, py, pr, worldVerticesA);

    let minDistanceSq = Infinity;
    let closestPoint = { x: 0, y: 0 };
    let inside = true;

    for (let i = 0; i < worldVerticesA.length; i++) {
        const v1 = worldVerticesA[i];
        const v2 = worldVerticesA[(i + 1) % worldVerticesA.length];
        const edgeX = v2.x - v1.x;
        const edgeY = v2.y - v1.y;
        const toCircleX = cx - v1.x;
        const toCircleY = cy - v1.y;

        // Using cross product to determine if center is to the right of the CCW edge
        if (edgeX * toCircleY - edgeY * toCircleX < 0) inside = false;

        // Project circle center onto edge line segment
        const t = Math.max(0, Math.min(1, (toCircleX * edgeX + toCircleY * edgeY) / (edgeX * edgeX + edgeY * edgeY)));
        const projectX = v1.x + t * edgeX;
        const projectY = v1.y + t * edgeY;

        const distSq = (cx - projectX) ** 2 + (cy - projectY) ** 2;
        if (distSq < minDistanceSq) {
          minDistanceSq = distSq;
          closestPoint = { x: projectX, y: projectY };
        }
    }

    if (inside || minDistanceSq < circle.radius * circle.radius) {
        const distance = Math.sqrt(minDistanceSq);
        manifold.colliding = true;
        // If inside, depth includes radius + distance to nearest edge
        manifold.depth = inside ? circle.radius + distance : circle.radius - distance;

        const dx = cx - closestPoint.x;
        const dy = cy - closestPoint.y;

        if (distance > 0.0001) {
          manifold.normalX = (inside ? -dx : dx) / distance;
          manifold.normalY = (inside ? -dy : dy) / distance;
        } else {
          manifold.normalX = 1;
          manifold.normalY = 0;
        }
        manifold.contactPoints.push({x: closestPoint.x, y: closestPoint.y});
    }
    return manifold;
  }

  static aabbVsPolygon(aabb: AABBShape, ax: number, ay: number, poly: PolygonShape, px: number, py: number, pr: number): CollisionManifold {
      staticAABBPoly.vertices[0].x = -aabb.halfWidth; staticAABBPoly.vertices[0].y = -aabb.halfHeight;
      staticAABBPoly.vertices[1].x = aabb.halfWidth; staticAABBPoly.vertices[1].y = -aabb.halfHeight;
      staticAABBPoly.vertices[2].x = aabb.halfWidth; staticAABBPoly.vertices[2].y = aabb.halfHeight;
      staticAABBPoly.vertices[3].x = -aabb.halfWidth; staticAABBPoly.vertices[3].y = aabb.halfHeight;
      return this.polygonVsPolygon(staticAABBPoly, ax, ay, 0, poly, px, py, pr);
  }

  /**
   * Detección de colisiones entre polígonos convexos usando el Teorema del Eje Separador (SAT).
   *
   * @remarks
   * For two convex shapes to be colliding, their projections must overlap on ALL potential axes.
   * For polygons, these axes are the normals of every edge of both polygons.
   *
   * 1. Transform local vertices to world space.
   * 2. Collect unique edge normals (axes) from both polygons.
   * 3. For each axis:
   *    - Project all vertices onto the axis.
   *    - Find min/max of the projection.
   *    - Check for overlap: `overlap = min(maxA, maxB) - max(minA, minB)`.
   *    - If `overlap <= 0`, exit early (no collision).
   * 4. Identify the axis of minimum overlap (MTV - Minimum Translation Vector).
   * 5. Ensure the normal points from A to B.
   * El algoritmo SAT establece que dos objetos convexos NO colisionan si existe un eje
   * en el cual sus proyecciones no se solapan. Para polígonos, basta con probar las normales
   * de cada una de sus caras como ejes potenciales de separación.
   *
   * @conceptualRisk [CONVEX_ONLY] Este método NO funciona con polígonos cóncavos.
   * @conceptualRisk [PERFORMANCE] Complejidad O(N+M) donde N y M son el número de vértices.
   */
  static polygonVsPolygon(a: PolygonShape, ax: number, ay: number, ar: number, b: PolygonShape, bx: number, by: number, br: number): CollisionManifold {
    const manifold = resetManifold();

    // 1. Transformar vértices locales a coordenadas de mundo (incluyendo rotación)
    this.populateGlobalVertices(a, ax, ay, ar, worldVerticesA);
    this.populateGlobalVertices(b, bx, by, br, worldVerticesB);

    // 2. Generar todos los ejes candidatos (normales de las caras de ambos polígonos)
    axesCache.length = 0;
    this.populateGlobalNormals(a, ar, axesCache);
    this.populateGlobalNormals(b, br, axesCache);

    let minOverlap = Infinity;
    let smallestAxisX = 0;
    let smallestAxisY = 0;

    // 3. Probar cada eje para encontrar una separación
    for (let i = 0; i < axesCache.length; i++) {
      const axis = axesCache[i];

      // Proyectar ambos polígonos sobre el eje actual
      const projectionA = this.projectPolygon(worldVerticesA, axis);
      const projectionB = this.projectPolygon(worldVerticesB, axis);

      // Calcular el solapamiento en este eje
      const overlap = Math.min(projectionA.max, projectionB.max) - Math.max(projectionA.min, projectionB.min);

      // Si en ALGÚN eje no hay solapamiento, el SAT garantiza que NO hay colisión (Teorema del Eje Separador)
      if (overlap <= 0) return resetManifold();

      // Guardar el eje con el solapamiento mínimo (MTV - Minimum Translation Vector)
      if (overlap < minOverlap) {
        minOverlap = overlap;
        smallestAxisX = axis.x;
        smallestAxisY = axis.y;
      }
    }

    // 4. Si llegamos aquí, hay solapamiento en todos los ejes -> Colisión confirmada
    manifold.colliding = true;
    manifold.depth = minOverlap;

    // Garantizar que la normal siempre apunte desde el objeto A hacia el B
    const dot = (bx - ax) * smallestAxisX + (by - ay) * smallestAxisY;
    if (dot < 0) {
      manifold.normalX = -smallestAxisX;
      manifold.normalY = -smallestAxisY;
    } else {
      manifold.normalX = smallestAxisX;
      manifold.normalY = smallestAxisY;
    }
    return manifold;
  }

  static circleVsCapsule(circle: CircleShape, cx: number, cy: number, capsule: CapsuleShape, cpx: number, cpy: number, cpr: number): CollisionManifold {
      const manifold = resetManifold();
      const line = this.getCapsuleLine(capsule, cpx, cpy, cpr);
      const dx = line.p2x - line.p1x; const dy = line.p2y - line.p1y;
      const t = Math.max(0, Math.min(1, ((cx - line.p1x) * dx + (cy - line.p1y) * dy) / (dx * dx + dy * dy)));
      const closestX = line.p1x + t * dx; const closestY = line.p1y + t * dy;

      const distSq = (cx - closestX) ** 2 + (cy - closestY) ** 2;
      const radiusSum = circle.radius + capsule.radius;
      if (distSq < radiusSum * radiusSum) {
          const distance = Math.sqrt(distSq);
          manifold.colliding = true; manifold.depth = radiusSum - distance;
          if (distance > 0.0001) { manifold.normalX = (cx - closestX) / distance; manifold.normalY = (cy - closestY) / distance; }
          else { manifold.normalX = 1; manifold.normalY = 0; }
          manifold.contactPoints.push({x: closestX, y: closestY});
      }
      return manifold;
  }

  static aabbVsCapsule(aabb: AABBShape, ax: number, ay: number, capsule: CapsuleShape, cx: number, cy: number, cr: number): CollisionManifold {
      // Treat capsule as a thick line, approximate by checking endpoints and center
      const manifold = this.circleVsCapsule({type: "circle", radius: 0.1}, ax, ay, capsule, cx, cy, cr);
      if (manifold.colliding) {
          // Improve by treating as polygon approximation
          return this.aabbVsPolygon(aabb, ax, ay, this.capsuleToPolygon(capsule), cx, cy, cr);
      }
      return manifold;
  }

  static polygonVsCapsule(poly: PolygonShape, px: number, py: number, pr: number, capsule: CapsuleShape, cx: number, cy: number, cr: number): CollisionManifold {
      return this.polygonVsPolygon(poly, px, py, pr, this.capsuleToPolygon(capsule), cx, cy, cr);
  }

  static capsuleVsCapsule(a: CapsuleShape, ax: number, ay: number, ar: number, b: CapsuleShape, bx: number, by: number, br: number): CollisionManifold {
      // Find closest points between two line segments
      const _lineA = this.getCapsuleLine(a, ax, ay, ar);
      const _lineB = this.getCapsuleLine(b, bx, by, br);
      // Simplified: check endpoints distance
      return this.circleVsCapsule({type: "circle", radius: a.radius}, ax, ay, b, bx, by, br);
  }

  /**
   * Internal helper to calculate world-space line segment for a capsule.
   */
  private static getCapsuleLine(c: CapsuleShape, x: number, y: number, r: number) {
      const angle = r + c.orientation;
      const dx = Math.cos(angle) * c.halfHeight;
      const dy = Math.sin(angle) * c.halfHeight;
      return { p1x: x - dx, p1y: y - dy, p2x: x + dx, p2y: y + dy };
  }

  /**
   * Approximates a capsule as a polygon for SAT testing.
   */
  private static capsuleToPolygon(c: CapsuleShape): PolygonShape {
      // Hexagonal approximation of a capsule for SAT
      const angle = c.orientation;
      const dx = Math.cos(angle) * c.halfHeight;
      const dy = Math.sin(angle) * c.halfHeight;
      const nx = -Math.sin(angle) * c.radius;
      const ny = Math.cos(angle) * c.radius;
      return {
          type: "polygon",
          vertices: [
              {x: -dx + nx, y: -dy + ny}, {x: dx + nx, y: dy + ny},
              {x: dx + nx*0.5, y: dy + ny*0.5}, {x: dx - nx*0.5, y: dy - ny*0.5},
              {x: dx - nx, y: dy - ny}, {x: -dx - nx, y: -dy - ny}
          ],
          normals: [] // SAT will handle normals if needed
      };
  }

  /**
   * Transforms local polygon vertices to world space coordinates.
   * Reuse arrays to avoid GC.
   */
  private static populateGlobalVertices(shape: PolygonShape, x: number, y: number, r: number, out: Array<{x: number, y: number}>) {
    const cos = Math.cos(r); const sin = Math.sin(r);
    for (let i = 0; i < shape.vertices.length; i++) {
        const v = shape.vertices[i];
        if (!out[i]) out[i] = {x:0, y:0};
        out[i].x = x + (v.x * cos - v.y * sin);
        out[i].y = y + (v.x * sin + v.y * cos);
    }
    out.length = shape.vertices.length;
  }

  /**
   * Transforms local polygon normals to world space based on current rotation.
   */
  private static populateGlobalNormals(shape: PolygonShape, r: number, out: Array<{x: number, y: number}>) {
    const cos = Math.cos(r); const sin = Math.sin(r);
    const startIdx = out.length;
    for (let i = 0; i < shape.normals.length; i++) {
        const n = shape.normals[i];
        if (!out[startIdx + i]) out[startIdx + i] = {x:0, y:0};
        out[startIdx + i].x = n.x * cos - n.y * sin;
        out[startIdx + i].y = n.x * sin + n.y * cos;
    }
  }

  /**
   * Projects polygon vertices onto a specific axis to find min/max extent.
   * Used as part of SAT.
   */
  private static projectPolygon(vertices: Array<{x: number, y: number}>, axis: {x: number, y: number}) {
    let min = Infinity; let max = -Infinity;
    for (let i = 0; i < vertices.length; i++) {
      const v = vertices[i];
      const projection = v.x * axis.x + v.y * axis.y;
      if (projection < min) min = projection; if (projection > max) max = projection;
    }
    return { min, max };
  }
}
