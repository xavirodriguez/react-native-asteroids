import { CircleShape, AABBShape, CapsuleShape, PolygonShape } from "./ShapeTypes";

/**
 * Static factory for creating geometric shapes with pre-calculated properties.
 *
 * @responsibility Simplify the creation of complex shapes like Polygons.
 * @responsibility Ensure consistent internal state (e.g., edge normals for SAT).
 *
 * @public
 */
export class ShapeFactory {
  /**
   * Creates a circle shape.
   *
   * @param radius - [px] The radius of the circle.
   */
  static circle(radius: number): CircleShape {
    return { type: "circle", radius };
  }

  /**
   * Creates an Axis-Aligned Bounding Box (AABB) shape.
   *
   * @param width - [px] Total width of the box.
   * @param height - [px] Total height of the box.
   * @returns AABB shape with calculated half-extents.
   */
  static aabb(width: number, height: number): AABBShape {
    return { type: "aabb", halfWidth: width / 2, halfHeight: height / 2 };
  }

  /**
   * Creates a capsule shape.
   *
   * @param radius - [px] Radius of the end caps.
   * @param height - [px] Total height of the straight section.
   */
  static capsule(radius: number, height: number): CapsuleShape {
    return { type: "capsule", radius, halfHeight: height / 2, orientation: 0 };
  }

  /**
   * Creates a custom convex polygon.
   *
   * @param vertices - Array of points in local space.
   *
   * @remarks
   * Vertices MUST be in Counter-Clockwise (CCW) order.
   * Automatically calculates edge normals for use in the SAT collision resolver.
   *
   * @returns Polygon shape with pre-calculated normals.
   */
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

  /**
   * Generates a regular polygon (e.g., pentagon, hexagon).
   *
   * @param sides - Number of edges/vertices.
   * @param radius - [px] Distance from the center to any vertex.
   */
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
