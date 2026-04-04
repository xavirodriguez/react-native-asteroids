import { System } from "../core/System";
import { World } from "../core/World";
import { PositionComponent, ColliderComponent, Entity, ReclaimableComponent, AABB } from "../types/EngineTypes";
import { SpatialHash } from "../collision/SpatialHash";

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
  private spatialHash = new SpatialHash(100);
  private queryResult = new Set<Entity>();
  private aabb: AABB = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

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

    // Broadphase with Spatial Hash
    this.spatialHash.clear();
    for (let i = 0; i < n; i++) {
      const id = colliders[i];
      const pos = world.getComponent<PositionComponent>(id, "Position")!;
      const col = world.getComponent<ColliderComponent>(id, "Collider")!;

      const layer = (col as any).layer !== undefined ? (col as any).layer : 1;
      const mask = (col as any).mask !== undefined ? (col as any).mask : 1;
      if (layer === 0 && mask === 0) continue;

      const halfWidth = (col as any).width ? (col as any).width / 2 : col.radius;
      const halfHeight = (col as any).height ? (col as any).height / 2 : col.radius;

      this.aabb.minX = pos.x - halfWidth;
      this.aabb.maxX = pos.x + halfWidth;
      this.aabb.minY = pos.y - halfHeight;
      this.aabb.maxY = pos.y + halfHeight;
      this.spatialHash.insert(id, this.aabb);
    }

    const processedPairs = new Set<string>();

    for (let i = 0; i < n; i++) {
      const idA = colliders[i];
      const posA = world.getComponent<PositionComponent>(idA, "Position")!;
      const colA = world.getComponent<ColliderComponent>(idA, "Collider");

      if (!colA) continue;
      const maskA = (colA as any).mask !== undefined ? (colA as any).mask : 1;
      if (maskA === 0) continue;

      const halfWidth = (colA as any).width ? (colA as any).width / 2 : colA.radius;
      const halfHeight = (colA as any).height ? (colA as any).height / 2 : colA.radius;

      this.aabb.minX = posA.x - halfWidth;
      this.aabb.maxX = posA.x + halfWidth;
      this.aabb.minY = posA.y - halfHeight;
      this.aabb.maxY = posA.y + halfHeight;

      this.queryResult.clear();
      this.spatialHash.query(this.aabb, this.queryResult);

      for (const idB of this.queryResult) {
        if (idA === idB) continue;

        const colB = world.getComponent<ColliderComponent>(idB, "Collider");
        if (!colB) continue;
        const layerB = (colB as any).layer !== undefined ? (colB as any).layer : 1;
        if (!(maskA & layerB)) continue;

        const pairKey = idA < idB ? `${idA},${idB}` : `${idB},${idA}`;
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        const posB = world.getComponent<PositionComponent>(idB, "Position")!;
        if (this.isCollidingWithComponents(posA, colA, posB, colB)) {
          this.onCollision(world, idA, idB);
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
