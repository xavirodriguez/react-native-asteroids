import { CircleShape, AABBShape, CapsuleShape, PolygonShape } from "./ShapeTypes";
export declare class ShapeFactory {
    static circle(radius: number): CircleShape;
    static aabb(width: number, height: number): AABBShape;
    static capsule(radius: number, height: number): CapsuleShape;
    static polygon(vertices: Array<{
        x: number;
        y: number;
    }>): PolygonShape;
    static regularPolygon(sides: number, radius: number): PolygonShape;
}
