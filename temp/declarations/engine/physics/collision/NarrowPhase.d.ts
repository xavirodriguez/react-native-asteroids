import { Shape, CircleShape, AABBShape, CapsuleShape, PolygonShape } from "../shapes/ShapeTypes";
import { CollisionManifold } from "../../core/CoreComponents";
export { CollisionManifold };
export declare class NarrowPhase {
    static test(shapeA: Shape, posXA: number, posYA: number, rotA: number, shapeB: Shape, posXB: number, posYB: number, rotB: number): CollisionManifold;
    static circleVsCircle(a: CircleShape, ax: number, ay: number, b: CircleShape, bx: number, by: number): CollisionManifold;
    static aabbVsAabb(a: AABBShape, ax: number, ay: number, b: AABBShape, bx: number, by: number): CollisionManifold;
    static circleVsAabb(circle: CircleShape, cx: number, cy: number, aabb: AABBShape, ax: number, ay: number): CollisionManifold;
    static circleVsPolygon(circle: CircleShape, cx: number, cy: number, poly: PolygonShape, px: number, py: number, pr: number): CollisionManifold;
    static aabbVsPolygon(aabb: AABBShape, ax: number, ay: number, poly: PolygonShape, px: number, py: number, pr: number): CollisionManifold;
    static polygonVsPolygon(a: PolygonShape, ax: number, ay: number, ar: number, b: PolygonShape, bx: number, by: number, br: number): CollisionManifold;
    static circleVsCapsule(circle: CircleShape, cx: number, cy: number, capsule: CapsuleShape, cpx: number, cpy: number, cpr: number): CollisionManifold;
    static aabbVsCapsule(aabb: AABBShape, ax: number, ay: number, capsule: CapsuleShape, cx: number, cy: number, cr: number): CollisionManifold;
    static polygonVsCapsule(poly: PolygonShape, px: number, py: number, pr: number, capsule: CapsuleShape, cx: number, cy: number, cr: number): CollisionManifold;
    static capsuleVsCapsule(a: CapsuleShape, ax: number, ay: number, ar: number, b: CapsuleShape, bx: number, by: number, br: number): CollisionManifold;
    private static getCapsuleLine;
    private static capsuleToPolygon;
    private static populateGlobalVertices;
    private static populateGlobalNormals;
    private static projectPolygon;
}
