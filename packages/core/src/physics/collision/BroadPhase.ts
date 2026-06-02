import { TransformComponent, Collider2DComponent, Entity, AABB } from "../../types/EngineTypes";

export class BroadPhase {
  static getShapeBounds(transform: Readonly<TransformComponent>, collider: Readonly<Collider2DComponent>): AABB {
    const worldX = transform.worldX ?? transform.x;
    const worldY = transform.worldY ?? transform.y;
    const cx = worldX + collider.offsetX;
    const cy = worldY + collider.offsetY;
    const shape = collider.shape;

    switch (shape.type) {
      case "circle":
        return {
          minX: cx - shape.radius,
          minY: cy - shape.radius,
          maxX: cx + shape.radius,
          maxY: cy + shape.radius,
        };
      case "aabb":
        return {
          minX: cx - shape.halfWidth,
          minY: cy - shape.halfHeight,
          maxX: cx + shape.halfWidth,
          maxY: cy + shape.halfHeight,
        };
      case "polygon": {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        const rotation = transform.worldRotation ?? transform.rotation;
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);

        for (const v of shape.vertices) {
          const vx = cx + (v.x * cos - v.y * sin);
          const vy = cy + (v.x * sin + v.y * cos);
          if (vx < minX) minX = vx;
          if (vx > maxX) maxX = vx;
          if (vy < minY) minY = vy;
          if (vy > maxY) maxY = vy;
        }
        return { minX, minY, maxX, maxY };
      }
      case "capsule": {
          const radius = shape.radius;
          return {
              minX: cx - radius - shape.halfHeight,
              minY: cy - radius - shape.halfHeight,
              maxX: cx + radius + shape.halfHeight,
              maxY: cy + radius + shape.halfHeight,
          };
      }
      default:
        return { minX: cx, minY: cy, maxX: cx, maxY: cy };
    }
  }

  /**
   * Implementation of the Sweep and Prune algorithm (1D).
   *
   * @remarks
   * Sorts entities by their X-axis minimum bound and checks for interval overlaps.
   * Designed to be efficient for sparse environments where objects are not tightly
   * clustered along the sort axis.
   *
   * Warning: **Complexity O(N log N)** due to sorting. For high-density environments
   * or clusters, using the `SpatialGrid` is recommended to help maintain performance.
   *
   * @param entities - List of entities to process.
   * @param world - ECS world for component retrieval.
   * @returns List of candidate entity pairs [A, B] for narrow-phase testing.
   */
  static sweepAndPrune(entities: Entity[], world: import("../../core/World").World): Array<[Entity, Entity]> {
    const bounds = entities.map(entity => {
      const transform = world.getComponent<TransformComponent>(entity, "Transform");
      const collider = world.getComponent<Collider2DComponent>(entity, "Collider2D");

      if (!transform || !collider) {
          console.warn(`Entity ${entity} missing components for SAP: Transform=${!!transform}, Collider=${!!collider}`);
          return { entity, aabb: { minX: 0, minY: 0, maxX: 0, maxY: 0 } };
      }

      return {
        entity,
        aabb: this.getShapeBounds(transform, collider)
      };
    });

    bounds.sort((a, b) => a.aabb.minX - b.aabb.minX);

    const pairs: Array<[Entity, Entity]> = [];
    for (let i = 0; i < bounds.length; i++) {
      for (let j = i + 1; j < bounds.length; j++) {
        const a = bounds[i];
        const b = bounds[j];
        if (b.aabb.minX > a.aabb.maxX) break;
        if (a.aabb.minY <= b.aabb.maxY && b.aabb.minY <= a.aabb.maxY) {
          pairs.push([a.entity, b.entity]);
        }
      }
    }
    return pairs;
  }
}
