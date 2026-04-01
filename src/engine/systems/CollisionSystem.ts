import { System } from "../core/System";
import { World } from "../core/World";
import { PositionComponent, ColliderComponent, Entity } from "../types/EngineTypes";

class BoundData {
  id: Entity = 0;
  pos: PositionComponent = { type: "Position", x: 0, y: 0 };
  col: ColliderComponent = { type: "Collider", radius: 0 };
  minX: number = 0;
  maxX: number = 0;
}

/**
 * Generic Collision System for the TinyAsterEngine.
 * Handles circle-to-circle collision detection with Sweep and Prune optimization.
 */
export abstract class CollisionSystem extends System {
  // Pre-allocate array to store bounds data and minimize GC pressure
  private boundsCache: BoundData[] = [];
  private activeBounds: BoundData[] = [];

  /**
   * Updates the collision state.
   * Optimizes checks using a simple Sweep and Prune algorithm.
   * Complexity: O(n log n) for sorting, plus O(n + collisions) for the sweep.
   */
  public update(world: World, deltaTime: number): void {
    void deltaTime;
    const colliders = world.query("Position", "Collider");
    const n = colliders.length;
    if (n < 2) return;

    // Adjust cache size if needed
    while (this.boundsCache.length < n) {
      this.boundsCache.push(new BoundData());
    }

    // Fill cache with current frame data and prepare active subset
    this.activeBounds.length = n;
    for (let i = 0; i < n; i++) {
      const id = colliders[i];
      const pos = world.getComponent<PositionComponent>(id, "Position")!;
      const col = world.getComponent<ColliderComponent>(id, "Collider")!;
      const b = this.boundsCache[i];
      b.id = id;
      b.pos = pos;
      b.col = col;
      b.minX = pos.x - col.radius;
      b.maxX = pos.x + col.radius;
      this.activeBounds[i] = b;
    }

    // Sort by minX
    this.activeBounds.sort((a, b) => a.minX - b.minX);

    // Sweep and Prune
    for (let i = 0; i < n; i++) {
      const a = this.activeBounds[i];
      const a_maxX = a.maxX;

      for (let j = i + 1; j < n; j++) {
        const b = this.activeBounds[j];

        // Since activeBounds is sorted by minX, if b's minX is already past a's maxX,
        // no further objects in the list can overlap with a on the X-axis.
        if (b.minX > a_maxX) {
          break;
        }

        if (this.isCollidingWithComponents(a.pos, a.col, b.pos, b.col)) {
          this.onCollision(world, a.id, b.id);
        }
      }
    }
  }

  /**
   * Internal collision check using pre-retrieved components.
   */
  private isCollidingWithComponents(posA: PositionComponent, colA: ColliderComponent, posB: PositionComponent, colB: ColliderComponent): boolean {
    const dx = posA.x - posB.x;
    const dy = posA.y - posB.y;
    const distanceSq = dx * dx + dy * dy;
    const radiusSum = colA.radius + colB.radius;
    return distanceSq < radiusSum * radiusSum;
  }

  /**
   * Circle-to-circle collision check.
   */
  protected isColliding(world: World, entityA: Entity, entityB: Entity): boolean {
    const posA = world.getComponent<PositionComponent>(entityA, "Position");
    const posB = world.getComponent<PositionComponent>(entityB, "Position");
    const colA = world.getComponent<ColliderComponent>(entityA, "Collider");
    const colB = world.getComponent<ColliderComponent>(entityB, "Collider");

    if (!posA || !posB || !colA || !colB) return false;

    const dx = posA.x - posB.x;
    const dy = posA.y - posB.y;
    const distanceSq = dx * dx + dy * dy;
    const radiusSum = colA.radius + colB.radius;

    return distanceSq < radiusSum * radiusSum;
  }

  /**
   * Abstract hook called when a collision is detected.
   * Concrete games implement this to handle specific logic.
   */
  protected abstract onCollision(world: World, entityA: Entity, entityB: Entity): void;
}
