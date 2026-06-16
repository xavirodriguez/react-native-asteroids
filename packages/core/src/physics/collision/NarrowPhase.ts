import { Shape, ShapeType } from "../shapes/Shapes";
import { CollisionManifold } from "./CollisionTypes";

const manifoldCache: CollisionManifold = {
  colliding: false,
  normalX: 0,
  normalY: 0,
  depth: 0,
  contactPoints: []
};

function resetManifold(): CollisionManifold {
  manifoldCache.colliding = false;
  manifoldCache.normalX = 0;
  manifoldCache.normalY = 0;
  manifoldCache.depth = 0;
  manifoldCache.contactPoints.length = 0;
  return manifoldCache;
}

export class NarrowPhase {
  public static test(
    shapeA: Shape, ax: number, ay: number, ar: number,
    shapeB: Shape, bx: number, by: number, br: number
  ): CollisionManifold {
    if (shapeA.type === ShapeType.Circle && shapeB.type === ShapeType.Circle) {
      return this.circleVsCircle(shapeA, ax, ay, shapeB, bx, by);
    }

    // For now, only circle vs circle is implemented in this port
    return resetManifold();
  }

  private static circleVsCircle(
    a: any, ax: number, ay: number,
    b: any, bx: number, by: number
  ): CollisionManifold {
    const manifold = resetManifold();
    const dx = bx - ax;
    const dy = by - ay;
    const distSq = dx * dx + dy * dy;
    const radiusSum = a.radius + b.radius;

    if (distSq < radiusSum * radiusSum) {
      const distance = Math.sqrt(distSq);
      manifold.colliding = true;
      manifold.depth = radiusSum - distance;
      if (distance > 0.0001) {
        manifold.normalX = dx / distance;
        manifold.normalY = dy / distance;
      } else {
        manifold.normalX = 1;
        manifold.normalY = 0;
      }
      manifold.contactPoints.push({ x: ax + manifold.normalX * a.radius, y: ay + manifold.normalY * a.radius });
    }
    return manifold;
  }
}
