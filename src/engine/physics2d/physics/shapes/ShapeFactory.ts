import { CircleShape, AABBShape, CapsuleShape, PolygonShape } from "./ShapeTypes";

export class ShapeFactory {
  static circle(radius: number): CircleShape {
    return { type: "circle", radius };
  }

  static aabb(width: number, height: number): AABBShape {
    return { type: "aabb", halfWidth: width / 2, halfHeight: height / 2 };
  }

  static capsule(radius: number, height: number): CapsuleShape {
    return { type: "capsule", radius, halfHeight: height / 2, orientation: 0 };
  }

  static polygon(vertices: Array<{ x: number; y: number }>): PolygonShape {
    const normals = [];
    for (let i = 0; i < vertices.length; i++) {
      const p1 = vertices[i];
      const p2 = vertices[(i + 1) % vertices.length];
      const edgeX = p2.x - p1.x;
      const edgeY = p2.y - p1.y;
      // Perpendicular vector (normal) for CCW vertices
      const length = Math.sqrt(edgeX * edgeX + edgeY * edgeY);
      normals.push({ x: -edgeY / length, y: edgeX / length });
    }
    return { type: "polygon", vertices, normals };
  }

  static regularPolygon(sides: number, radius: number): PolygonShape {
    const vertices = [];
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
      vertices.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }
    return this.polygon(vertices);
  }
}
