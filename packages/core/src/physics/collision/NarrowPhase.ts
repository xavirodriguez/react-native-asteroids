/**
 * Implementation of Narrow Phase collision detection algorithms.
 *
 * This module provides precise collision detection between different geometric primitives
 * using algorithms like Separating Axis Theorem (SAT) and distance-based checks.
 * It generates a {@link CollisionManifold} containing details about collision state,
 * normals, penetration depth, and contact points.
 *
 * @remarks
 * La mayoría de los algoritmos aquí asumen geometría euclidiana estándar.
 *
 * ### Teorema del Eje Separador (SAT)
 * Para dos formas convexas, si existe un eje en el que sus proyecciones no se solapan,
 * entonces no están colisionando. El sistema prueba todos los ejes potenciales (normales
 * de las aristas para polígonos, y el eje entre centros para círculos).
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
 * El sistema utiliza pooling de objetos y manifolds compartidos para ayudar a reducir
 * la presión sobre el recolector de basura (GC) durante el paso de física.
 * Cabe destacar que el sistema está diseñado para minimizar las allocaciones en el hot path,
 * aunque pueden ocurrir allocaciones por iteradores internos, cierres
 * locales o crecimiento de los pools.
 *
 * @packageDocumentation
 */

import { Shape, CircleShape, AABBShape, CapsuleShape, PolygonShape } from "../shapes/ShapeTypes";

import { CollisionManifold } from "./CollisionTypes";
export { CollisionManifold };

interface MutableVector2 {
  x: number;
  y: number;
}

const sharedManifold: CollisionManifold = {
  colliding: false,
  normalX: 0,
  normalY: 0,
  depth: 0,
  contactPoints: [],
};

/**
 * Pool de vértices para puntos de contacto y cálculos intermedios.
 * Reutilizado para ayudar a reducir allocations en el hot path de física.
 */
const vertexPool: MutableVector2[] = [];
function _getVertex(x: number, y: number) {
    let v = vertexPool.pop();
    if (!v) v = {x: 0, y: 0};
    v.x = x; v.y = y;
    return v;
}

/**
 * Reinicia el manifold compartido y devuelve los puntos de contacto al pool.
 */
function resetManifold(): CollisionManifold {
  sharedManifold.colliding = false;
  sharedManifold.normalX = 0;
  sharedManifold.normalY = 0;
  sharedManifold.depth = 0;
  // Devolver puntos de contacto al pool
  const contacts = sharedManifold.contactPoints as MutableVector2[];
  for (let i = 0; i < contacts.length; i++) {
    vertexPool.push(contacts[i]);
  }
  contacts.length = 0;
  return sharedManifold;
}

const axesCache: MutableVector2[] = [];
const worldVerticesA: MutableVector2[] = [];
const worldVerticesB: MutableVector2[] = [];

const staticAABBPolyVertices: MutableVector2[] = [
    {x:0,y:0},{x:0,y:0},{x:0,y:0},{x:0,y:0}
];

const staticAABBPoly: PolygonShape = {
    type: "polygon",
    vertices: staticAABBPolyVertices,
    normals: [{x:0,y:-1}, {x:1,y:0}, {x:0,y:1}, {x:-1,y:0}]
};

/**
 * Objetos estáticos mutables para evitar allocations en cálculos de proyección y cápsulas.
 */
const staticCircle: CircleShape = { type: "circle", radius: 0 };
const staticProjectionA = { min: 0, max: 0 };
const staticProjectionB = { min: 0, max: 0 };
const staticCapsuleLine = { p1x: 0, p1y: 0, p2x: 0, p2y: 0 };

const staticCapsulePolyVertices: MutableVector2[] = [
    {x:0,y:0}, {x:0,y:0}, {x:0,y:0}, {x:0,y:0}, {x:0,y:0}, {x:0,y:0}
];

const staticCapsulePoly: PolygonShape = {
    type: "polygon",
    vertices: staticCapsulePolyVertices,
    normals: []
};

/**
 * Implementación de algoritmos de detección de colisiones de Fase Estrecha (Narrow Phase).
 *
 * Proporciona detección entre primitivas geométricas mediante el Teorema del Eje Separador (SAT)
 * y comprobaciones basadas en distancia. Genera un {@link CollisionManifold} con normales, profundidad
 * y puntos de contacto.
 *
 * @remarks
 * El sistema está diseñado para ayudar a reducir las allocaciones por frame mediante el uso de manifolds
 * compartidos y pools de objetos. Está optimizado para simulaciones de alta frecuencia (60Hz+).
 *
 * @conceptualRisk [FLOAT_PRECISION][MEDIUM] Los productos cruzados y normalizaciones dependen de un épsilon (0.0001)
 * para evitar divisiones por cero en colisiones casi perfectas.
 * @conceptualRisk [GC_PRESSURE][LOW] Aunque usa pools, el manifold devuelto es una referencia compartida;
 * se recomienda procesarlo inmediatamente o copiarlo si se requiere persistencia.
 *
 * @warning **Shared State**: El uso de manifolds y pools compartidos significa que los resultados
 * no son thread-safe y deben consumirse de forma síncrona inmediatamente tras la llamada a `test()`.
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
    shapeA: Readonly<Shape>, posXA: number, posYA: number, rotA: number,
    shapeB: Readonly<Shape>, posXB: number, posYB: number, rotB: number
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
   * Detección de colisiones entre dos círculos.
   *
   * @remarks
   * Utiliza la comparación de distancias: `distancia(A, B) < radioA + radioB`.
   * Por rendimiento, se comparan las distancias al cuadrado para evitar `Math.sqrt`.
   */
  static circleVsCircle(a: Readonly<CircleShape>, ax: number, ay: number, b: Readonly<CircleShape>, bx: number, by: number): CollisionManifold {
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
        // Degenerate case: centers are approximately the same
        manifold.normalX = 1;
        manifold.normalY = 0;
      }

      // Contact point is along the normal at radius distance from A
      (manifold.contactPoints as Array<{x: number, y: number}>).push(_getVertex(ax + manifold.normalX * a.radius, ay + manifold.normalY * a.radius));
    }
    return manifold;
  }

  /**
   * Detección de colisiones entre dos Axis-Aligned Bounding Boxes (AABBs).
   * Calcula el solapamiento en ambos ejes y elige el eje de mínima penetración.
   */
  static aabbVsAabb(a: Readonly<AABBShape>, ax: number, ay: number, b: Readonly<AABBShape>, bx: number, by: number): CollisionManifold {
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
   * Detección de colisiones entre un círculo y un AABB.
   *
   * @remarks
   * Emplea el método de "Clamping":
   * 1. Encuentra el punto en el AABB más cercano al centro del círculo limitando (clamping) las coordenadas del centro al rango del AABB.
   * 2. Calcula la distancia entre el centro del círculo y este punto más cercano.
   * 3. Si la distancia < radio del círculo, está ocurriendo una colisión.
   *
   * Caso especial: Si el centro del círculo está *dentro* del AABB, la normal y la profundidad se calculan
   * basándose en la distancia a la arista más cercana del AABB.
   */
  static circleVsAabb(circle: Readonly<CircleShape>, cx: number, cy: number, aabb: Readonly<AABBShape>, ax: number, ay: number): CollisionManifold {
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
      (manifold.contactPoints as Array<{x: number, y: number}>).push(_getVertex(closestX, closestY));
    }
    return manifold;
  }

  /**
   * Detección de colisiones entre un círculo y un polígono convexo.
   *
   * @remarks
   * Combina pruebas de punto más cercano y el principio del SAT simplificado para círculos:
   * 1. Se transforman los vértices del polígono al espacio de mundo.
   * 2. Para cada arista, se proyecta el centro del círculo sobre el segmento de la arista.
   * 3. Se determina si el centro está "dentro" del polígono verificando el signo del producto cruzado
   *    con cada arista (asumiendo vértices en sentido anti-horario CCW).
   * 4. La normal de colisión apunta desde el punto más cercano en el perímetro hacia el centro del círculo.
   *
   * ### Derivación de la Normal:
   * Si el centro está fuera, la normal es `(Centro - PuntoCercano)`.
   * Si está dentro, la normal se invierte y la profundidad incluye el radio más la distancia a la arista.
   *
   * @param circle - Definición del círculo.
   * @param cx - X del centro del círculo.
   * @param cy - Y del centro del círculo.
   * @param poly - Polígono convexo.
   */
  static circleVsPolygon(circle: Readonly<CircleShape>, cx: number, cy: number, poly: Readonly<PolygonShape>, px: number, py: number, pr: number): CollisionManifold {
    const manifold = resetManifold();
    this.populateGlobalVertices(poly, px, py, pr, worldVerticesA);

    let minDistanceSq = Infinity;
    let closestX = 0;
    let closestY = 0;
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
          closestX = projectX;
          closestY = projectY;
        }
    }

    if (inside || minDistanceSq < circle.radius * circle.radius) {
        const distance = Math.sqrt(minDistanceSq);
        manifold.colliding = true;
        // If inside, depth includes radius + distance to nearest edge
        manifold.depth = inside ? circle.radius + distance : circle.radius - distance;

        const dx = cx - closestX;
        const dy = cy - closestY;

        if (distance > 0.0001) {
          manifold.normalX = (inside ? -dx : dx) / distance;
          manifold.normalY = (inside ? -dy : dy) / distance;
        } else {
          manifold.normalX = 1;
          manifold.normalY = 0;
        }
        (manifold.contactPoints as Array<{x: number, y: number}>).push(_getVertex(closestX, closestY));
    }
    return manifold;
  }

  static aabbVsPolygon(aabb: Readonly<AABBShape>, ax: number, ay: number, poly: Readonly<PolygonShape>, px: number, py: number, pr: number): CollisionManifold {
      staticAABBPolyVertices[0].x = -aabb.halfWidth; staticAABBPolyVertices[0].y = -aabb.halfHeight;
      staticAABBPolyVertices[1].x = aabb.halfWidth; staticAABBPolyVertices[1].y = -aabb.halfHeight;
      staticAABBPolyVertices[2].x = aabb.halfWidth; staticAABBPolyVertices[2].y = aabb.halfHeight;
      staticAABBPolyVertices[3].x = -aabb.halfWidth; staticAABBPolyVertices[3].y = aabb.halfHeight;
      return this.polygonVsPolygon(staticAABBPoly, ax, ay, 0, poly, px, py, pr);
  }

  /**
   * Detección de colisiones entre polígonos convexos mediante el Teorema del Eje Separador (SAT).
   *
   * @remarks
   * El Teorema del Eje Separador (SAT) establece que para dos objetos convexos, si existe un eje
   * en el que sus proyecciones no se solapan, entonces NO están colisionando.
   *
   * ### Pasos Matemáticos:
   * 1. **Transformación**: Los vértices locales se transforman a coordenadas de mundo usando rotación y traslación.
   * 2. **Generación de Ejes**: Para los polígonos, los ejes potenciales de separación son las normales de las caras de ambas formas.
   * 3. **Proyección**: Cada vértice de ambos polígonos se proyecta sobre cada eje potencial: `proj = vértice · eje`.
   * 4. **Comprobación de Solapamiento**: Se calcula el intervalo de proyección `[min, max]` para ambos polígonos.
   *    - Solapamiento: `L = min(maxA, maxB) - max(minA, minB)`
   *    - Si `L <= 0` en CUALQUIER eje, las formas están separadas (salida temprana).
   * 5. **MTV (Vector de Traslación Mínima)**: El eje con el solapamiento mínimo es la normal de colisión,
   *    y el valor del solapamiento es la profundidad de penetración.
   *
   * ### SAT Projection Diagram:
   * ```
   *      Polygon A          Axis (Normal)
   *       /---\               ^
   *      /     \              |     [---] Projection A
   *      \     /              |
   *       \---/               |     (Gap) -> overlap <= 0 -> SEPARATED!
   *                           |
   *             /---\         |     [---] Projection B
   *            /     \        |
   *           \---/           |
   *          Polygon B
   * ```
   *
   * @conceptualRisk [CONVEX_ONLY] This method only supports convex polygons. Concave shapes will produce false negatives.
   * @conceptualRisk [PERFORMANCE] Complexity is approximately O(N + M) where N and M are the number of vertices.
   * @param a - Shape A.
   * @param ax - X position of A.
   * @param ay - Y position of A.
   * @param ar - Rotation of A in radians.
   * @param b - Shape B.
   * @param bx - X position of B.
   * @param by - Y position of B.
   * @param br - Rotation of B in radians.
   * @returns Collision manifold with depth and normal.
   */
  static polygonVsPolygon(a: Readonly<PolygonShape>, ax: number, ay: number, ar: number, b: Readonly<PolygonShape>, bx: number, by: number, br: number): CollisionManifold {
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

      // Proyectar ambos polígonos sobre el eje actual (usa objetos estáticos para evitar allocations)
      this.projectPolygon(worldVerticesA, axis, staticProjectionA);
      this.projectPolygon(worldVerticesB, axis, staticProjectionB);

      // Calcular el solapamiento en este eje
      const overlap = Math.min(staticProjectionA.max, staticProjectionB.max) - Math.max(staticProjectionA.min, staticProjectionB.min);

      // Si en ALGÚN eje no hay solapamiento, el SAT indica que NO hay colisión (Teorema del Eje Separador)
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

    // Intenta asegurar que la normal apunte desde el objeto A hacia el B
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

  /**
   * Detección de colisiones entre un círculo y una cápsula.
   *
   * @remarks
   * Una cápsula se define matemáticamente como un segmento de línea con un radio.
   * La colisión se resuelve encontrando el punto más cercano en el segmento al centro del círculo.
   * 1. Se calcula el segmento de línea central de la cápsula (`getCapsuleLine`).
   * 2. Se proyecta el centro del círculo sobre esta línea, limitando el parámetro `t` a [0, 1].
   * 3. Se realiza una prueba de círculo vs círculo entre el círculo original y un círculo virtual
   *    situado en el punto más cercano de la línea con el radio de la cápsula.
   */
  static circleVsCapsule(circle: Readonly<CircleShape>, cx: number, cy: number, capsule: Readonly<CapsuleShape>, cpx: number, cpy: number, cpr: number): CollisionManifold {
      const manifold = resetManifold();
      const line = this.getCapsuleLine(capsule, cpx, cpy, cpr);
      const dx = line.p2x - line.p1x; const dy = line.p2y - line.p1y;
      // Proyección escalar para encontrar el punto más cercano en el segmento
      const t = Math.max(0, Math.min(1, ((cx - line.p1x) * dx + (cy - line.p1y) * dy) / (dx * dx + dy * dy)));
      const closestX = line.p1x + t * dx; const closestY = line.p1y + t * dy;

      const distSq = (cx - closestX) ** 2 + (cy - closestY) ** 2;
      const radiusSum = circle.radius + capsule.radius;
      if (distSq < radiusSum * radiusSum) {
          const distance = Math.sqrt(distSq);
          manifold.colliding = true; manifold.depth = radiusSum - distance;
          if (distance > 0.0001) { manifold.normalX = (cx - closestX) / distance; manifold.normalY = (cy - closestY) / distance; }
          else { manifold.normalX = 1; manifold.normalY = 0; }
          (manifold.contactPoints as Array<{x: number, y: number}>).push(_getVertex(closestX, closestY));
      }
      return manifold;
  }

  static aabbVsCapsule(aabb: Readonly<AABBShape>, ax: number, ay: number, capsule: Readonly<CapsuleShape>, cx: number, cy: number, cr: number): CollisionManifold {
      // Treat capsule as a thick line, approximate by checking endpoints and center
      staticCircle.radius = 0.1;
      const manifold = this.circleVsCapsule(staticCircle, ax, ay, capsule, cx, cy, cr);
      if (manifold.colliding) {
          // Improve by treating as polygon approximation
          return this.aabbVsPolygon(aabb, ax, ay, this.capsuleToPolygon(capsule), cx, cy, cr);
      }
      return manifold;
  }

  static polygonVsCapsule(poly: Readonly<PolygonShape>, px: number, py: number, pr: number, capsule: Readonly<CapsuleShape>, cx: number, cy: number, cr: number): CollisionManifold {
      return this.polygonVsPolygon(poly, px, py, pr, this.capsuleToPolygon(capsule), cx, cy, cr);
  }

  static capsuleVsCapsule(a: Readonly<CapsuleShape>, ax: number, ay: number, ar: number, b: Readonly<CapsuleShape>, bx: number, by: number, br: number): CollisionManifold {
      // Find closest points between two line segments
      const _lineA = this.getCapsuleLine(a, ax, ay, ar);
      const _lineB = this.getCapsuleLine(b, bx, by, br);
      // Simplified: check endpoints distance
      staticCircle.radius = a.radius;
      return this.circleVsCapsule(staticCircle, ax, ay, b, bx, by, br);
  }

  /**
   * Internal helper to calculate world-space line segment for a capsule.
   * Uses a static object to avoid allocations.
   */
  private static getCapsuleLine(c: Readonly<CapsuleShape>, x: number, y: number, r: number) {
      const angle = r + c.orientation;
      const dx = Math.cos(angle) * c.halfHeight;
      const dy = Math.sin(angle) * c.halfHeight;
      staticCapsuleLine.p1x = x - dx;
      staticCapsuleLine.p1y = y - dy;
      staticCapsuleLine.p2x = x + dx;
      staticCapsuleLine.p2y = y + dy;
      return staticCapsuleLine;
  }

  /**
   * Approximates a capsule as a polygon for SAT testing.
   * Uses a static mutable PolygonShape to avoid allocations.
   */
  private static capsuleToPolygon(c: Readonly<CapsuleShape>): PolygonShape {
      // Hexagonal approximation of a capsule for SAT
      const angle = c.orientation;
      const dx = Math.cos(angle) * c.halfHeight;
      const dy = Math.sin(angle) * c.halfHeight;
      const nx = -Math.sin(angle) * c.radius;
      const ny = Math.cos(angle) * c.radius;

      staticCapsulePolyVertices[0].x = -dx + nx; staticCapsulePolyVertices[0].y = -dy + ny;
      staticCapsulePolyVertices[1].x = dx + nx;  staticCapsulePolyVertices[1].y = dy + ny;
      staticCapsulePolyVertices[2].x = dx + nx*0.5; staticCapsulePolyVertices[2].y = dy + ny*0.5;
      staticCapsulePolyVertices[3].x = dx - nx*0.5; staticCapsulePolyVertices[3].y = dy - ny*0.5;
      staticCapsulePolyVertices[4].x = dx - nx;  staticCapsulePolyVertices[4].y = dy - ny;
      staticCapsulePolyVertices[5].x = -dx - nx; staticCapsulePolyVertices[5].y = -dy - ny;

      return staticCapsulePoly;
  }

  /**
   * Transforms local polygon vertices to world space coordinates.
   * Reuse arrays to avoid GC.
   */
  private static populateGlobalVertices(shape: Readonly<PolygonShape>, x: number, y: number, r: number, out: Array<{x: number, y: number}>) {
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
  private static populateGlobalNormals(shape: Readonly<PolygonShape>, r: number, out: Array<{x: number, y: number}>) {
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
   * Used as part of SAT. Updates the 'out' object to avoid allocations.
   */
  private static projectPolygon(vertices: Array<{x: number, y: number}>, axis: {x: number, y: number}, out: {min: number, max: number}) {
    let min = Infinity; let max = -Infinity;
    for (let i = 0; i < vertices.length; i++) {
      const v = vertices[i];
      const projection = v.x * axis.x + v.y * axis.y;
      if (projection < min) min = projection; if (projection > max) max = projection;
    }
    out.min = min;
    out.max = max;
  }
}
