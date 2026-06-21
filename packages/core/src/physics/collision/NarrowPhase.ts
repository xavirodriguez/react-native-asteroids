import { Shape, ShapeType, CircleShape, BoxShape } from "../shapes/Shapes";
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
    if (shapeA.type === ShapeType.Circle) {
      if (shapeB.type === ShapeType.Circle) {
        return this.circleVsCircle(shapeA, ax, ay, shapeB, bx, by);
      } else if (shapeB.type === ShapeType.Box) {
        return this.circleVsBox(shapeA, ax, ay, shapeB, bx, by, br);
      }
    } else if (shapeA.type === ShapeType.Box) {
      if (shapeB.type === ShapeType.Circle) {
        const manifold = this.circleVsBox(shapeB, bx, by, shapeA, ax, ay, ar);
        manifold.normalX *= -1;
        manifold.normalY *= -1;
        return manifold;
      } else if (shapeB.type === ShapeType.Box) {
        return this.boxVsBox(shapeA, ax, ay, ar, shapeB, bx, by, br);
      }
    }

    return resetManifold();
  }

  private static circleVsCircle(
    a: CircleShape, ax: number, ay: number,
    b: CircleShape, bx: number, by: number
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

  private static circleVsBox(
    a: CircleShape, ax: number, ay: number,
    b: BoxShape, bx: number, by: number, br: number
  ): CollisionManifold {
    const manifold = resetManifold();
    const halfW = b.width / 2;
    const halfH = b.height / 2;
    const dx = ax - bx;
    const dy = ay - by;
    const closestX = Math.max(-halfW, Math.min(halfW, dx));
    const closestY = Math.max(-halfH, Math.min(halfH, dy));
    const distanceX = dx - closestX;
    const distanceY = dy - closestY;
    const distanceSq = distanceX * distanceX + distanceY * distanceY;

    if (distanceSq < a.radius * a.radius) {
      const distance = Math.sqrt(distanceSq);
      manifold.colliding = true;
      manifold.depth = a.radius - distance;
      if (distance > 0.0001) {
        manifold.normalX = distanceX / distance;
        manifold.normalY = distanceY / distance;
      } else {
        if (Math.abs(dx) > Math.abs(dy)) {
          manifold.normalX = dx > 0 ? 1 : -1;
          manifold.normalY = 0;
          manifold.depth = a.radius + halfW - Math.abs(dx);
        } else {
          manifold.normalX = 0;
          manifold.normalY = dy > 0 ? 1 : -1;
          manifold.depth = a.radius + halfH - Math.abs(dy);
        }
      }
      manifold.contactPoints.push({ x: ax - manifold.normalX * a.radius, y: ay - manifold.normalY * a.radius });
    }
    return manifold;
  }

  private static boxVsBox(
    a: BoxShape, ax: number, ay: number, ar: number,
    b: BoxShape, bx: number, by: number, br: number
  ): CollisionManifold {
    const manifold = resetManifold();
    const aHalfW = a.width / 2;
    const aHalfH = a.height / 2;
    const bHalfW = b.width / 2;
    const bHalfH = b.height / 2;
    const dx = bx - ax;
    const dy = by - ay;
    const overlapX = aHalfW + bHalfW - Math.abs(dx);
    const overlapY = aHalfH + bHalfH - Math.abs(dy);

    if (overlapX > 0 && overlapY > 0) {
      manifold.colliding = true;
      if (overlapX < overlapY) {
        manifold.normalX = dx > 0 ? 1 : -1;
        manifold.normalY = 0;
        manifold.depth = overlapX;
      } else {
        manifold.normalX = 0;
        manifold.normalY = dy > 0 ? 1 : -1;
        manifold.depth = overlapY;
      }
      manifold.contactPoints.push({ x: ax + manifold.normalX * aHalfW, y: ay + manifold.normalY * aHalfH });
    }
    return manifold;
  }
}
