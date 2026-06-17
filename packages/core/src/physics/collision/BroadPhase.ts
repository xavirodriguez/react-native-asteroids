import { TransformComponent, ColliderComponent, CoreComponentRegistry } from "../../ecs/CoreComponents";
import { Entity } from "../../ecs/Entity";
import { World } from "../../ecs/World";
import { AABB } from "./CollisionTypes";
import { ShapeType } from "../shapes/Shapes";

/**
 * Bounds object used for Sweep and Prune to avoid allocations.
 */
interface EntityBounds {
  entity: Entity;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const boundsPool: EntityBounds[] = [];

export class BroadPhase {
  static getShapeBounds(transform: Readonly<TransformComponent>, collider: Readonly<ColliderComponent>): AABB {
    const worldX = transform.worldX ?? transform.x;
    const worldY = transform.worldY ?? transform.y;
    const cx = worldX + (collider.offsetX ?? 0);
    const cy = worldY + (collider.offsetY ?? 0);
    const shape = collider.shape;

    if (shape.type === ShapeType.Circle) {
      return {
        minX: cx - shape.radius,
        minY: cy - shape.radius,
        maxX: cx + shape.radius,
        maxY: cy + shape.radius,
      };
    } else if (shape.type === ShapeType.Box) {
      return {
        minX: cx - shape.width / 2,
        minY: cy - shape.height / 2,
        maxX: cx + shape.width / 2,
        maxY: cy + shape.height / 2,
      };
    }

    return { minX: cx, minY: cy, maxX: cx, maxY: cy };
  }

  /**
   * Implementation of the Sweep and Prune algorithm (1D) optimized to minimize allocations.
   */
  static sweepAndPrune(entities: Entity[], world: World<CoreComponentRegistry>): Array<[Entity, Entity]> {
    // Re-use or expand boundsPool to avoid re-allocating the array and objects
    const count = entities.length;
    for (let i = 0; i < count; i++) {
      const entity = entities[i];
      const transform = world.getComponent(entity, "Transform") as unknown as TransformComponent;
      const collider = world.getComponent(entity, "Collider") as unknown as ColliderComponent;

      if (!boundsPool[i]) {
        boundsPool[i] = { entity: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 };
      }

      const b = boundsPool[i];
      b.entity = entity;

      if (!transform || !collider) {
        b.minX = b.minY = b.maxX = b.maxY = 0;
      } else {
        const aabb = this.getShapeBounds(transform, collider);
        b.minX = aabb.minX;
        b.minY = aabb.minY;
        b.maxX = aabb.maxX;
        b.maxY = aabb.maxY;
      }
    }

    // Sort only the active portion of the pool
    const activeBounds = boundsPool.slice(0, count);
    activeBounds.sort((a, b) => a.minX - b.minX);

    const pairs: Array<[Entity, Entity]> = [];
    for (let i = 0; i < count; i++) {
      const a = activeBounds[i];
      if (a.entity === 0) continue; // Skip invalid

      for (let j = i + 1; j < count; j++) {
        const b = activeBounds[j];
        if (b.minX > a.maxX) break;
        if (a.minY <= b.maxY && b.minY <= a.maxY) {
          pairs.push([a.entity, b.entity]);
        }
      }
    }
    return pairs;
  }
}
