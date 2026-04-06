import { System } from "../core/System";
import { World } from "../core/World";
import { TransformComponent, ColliderComponent, Entity, ReclaimableComponent } from "../types/EngineTypes";
import { SpatialHash } from "../collision/SpatialHash";
import { ObjectPool } from "../utils/ObjectPool";

class BoundData {
  id: Entity = 0;
  pos: TransformComponent = { type: "Transform", x: 0, y: 0 };
  col: ColliderComponent = { type: "Collider", radius: 0 };
}

/**
 * Generic Collision System for the TinyAsterEngine.
 * Handles circle-to-circle collision detection with Spatial Hash broadphase optimization.
 */
export abstract class CollisionSystem extends System {
  // Use ObjectPool to manage BoundData objects and minimize GC pressure
  private boundsPool: ObjectPool<BoundData> = new ObjectPool<BoundData>(
    () => new BoundData(),
    (b) => {
      b.id = 0;
      b.pos = null as any;
      b.col = null as any;
    },
    20
  );
  private activeBounds: BoundData[] = [];
  private spatialHash: SpatialHash = new SpatialHash(150);
  private processedPairs: Set<number> = new Set();

  /**
   * Updates the collision state.
   * Optimizes checks using a numerical Spatial Hash broadphase.
   * Complexity: O(n) average case for uniform distributions.
   */
  public update(world: World, deltaTime: number): void {
    void deltaTime;
    const colliders = world.query("Transform", "Collider");
    const n = colliders.length;
    if (n < 2) return;

    // Release previous frame's bounds back to the pool
    this.activeBounds.forEach(b => this.boundsPool.release(b));
    this.activeBounds.length = 0;

    this.spatialHash.clear();
    this.processedPairs.clear();

    // Populate spatial hash and active bounds using the pool
    for (let i = 0; i < n; i++) {
      const id = colliders[i];
      const pos = world.getComponent<TransformComponent>(id, "Transform")!;
      const col = world.getComponent<ColliderComponent>(id, "Collider")!;

      const b = this.boundsPool.acquire();
      b.id = id;
      b.pos = pos;
      b.col = col;
      this.activeBounds.push(b);

      this.spatialHash.add(id, pos.x, pos.y, col.radius);
    }

    // Narrow phase detection based on spatial hash candidates
    for (let i = 0; i < n; i++) {
      const a = this.activeBounds[i];
      const candidates = this.spatialHash.getCandidates(a.pos.x, a.pos.y, a.col.radius);

      candidates.forEach((bId) => {
        if (a.id === bId) return;

        // Ensure we only check each pair once
        // Numerical key for pairId to avoid string GC
        const pairId = a.id < bId ? (a.id << 16) | (bId & 0xFFFF) : (bId << 16) | (a.id & 0xFFFF);
        if (this.processedPairs.has(pairId)) return;
        this.processedPairs.add(pairId);

        const bPos = world.getComponent<TransformComponent>(bId, "Transform");
        const bCol = world.getComponent<ColliderComponent>(bId, "Collider");

        if (bPos && bCol && this.isCollidingWithComponents(a.pos, a.col, bPos, bCol)) {
          this.onCollision(world, a.id, bId);
        }
      });
    }

  }

  /**
   * Internal collision check using pre-retrieved components.
   */
  private isCollidingWithComponents(posA: TransformComponent, colA: ColliderComponent, posB: TransformComponent, colB: ColliderComponent): boolean {
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
    const posA = world.getComponent<TransformComponent>(entityA, "Transform");
    const posB = world.getComponent<TransformComponent>(entityB, "Transform");
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

  /**
   * Identifies if a pair of entities matches two specified component types.
   * Returns an object mapping the types to their respective entities if they match,
   * otherwise returns undefined.
   */
  protected matchPair<T1 extends string, T2 extends string>(
    world: World,
    entityA: Entity,
    entityB: Entity,
    type1: T1,
    type2: T2
  ): Record<T1 | T2, Entity> | undefined {
    if (world.hasComponent(entityA, type1) && world.hasComponent(entityB, type2)) {
      return { [type1]: entityA, [type2]: entityB } as Record<T1 | T2, Entity>;
    }
    if (world.hasComponent(entityB, type1) && world.hasComponent(entityA, type2)) {
      return { [type1]: entityB, [type2]: entityA } as Record<T1 | T2, Entity>;
    }
    return undefined;
  }

  /**
   * Destroys an entity, notifying its pool if it possesses a ReclaimableComponent.
   */
  protected destroyEntity(world: World, entity: Entity): void {
    const reclaimable = world.getComponent<ReclaimableComponent>(entity, "Reclaimable");
    if (reclaimable) {
      reclaimable.onReclaim(world, entity);
    }
    world.removeEntity(entity);
  }
}
