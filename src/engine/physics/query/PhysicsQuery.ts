import { World } from "../../core/World";
import { Entity, Collider2DComponent, TransformComponent, Shape } from "../../types/EngineTypes";
import { Ray, RaycastHit } from "./QueryTypes";
import { RaycastTests } from "./RaycastTests";
import { ALL_LAYERS } from "../collision/CollisionLayers";
import { NarrowPhase } from "../collision/NarrowPhase";

/**
 * Service for performing spatial queries against the physics world.
 *
 * @responsibility Provide high-level APIs for raycasting, overlap tests, and shape casting.
 * @responsibility Filter results based on collision layers and ignored entities.
 *
 * @remarks
 * Most methods in this class iterate over entities with `Collider2DComponent`.
 * While efficient, these queries are O(N) relative to the number of colliders.
 * For massive worlds, consider using spatial partitioning optimizations.
 *
 * @public
 */
export class PhysicsQuery {
  /**
   * Performs a raycast and returns the first hit.
   *
   * @param world - The ECS world.
   * @param ray - The ray definition.
   * @param layerMask - Bitmask to filter relevant collision layers.
   * @param ignoredEntities - Optional set of entities to skip.
   * @returns The closest {@link RaycastHit} or `null` if nothing was hit.
   */
  static raycast(world: World, ray: Ray, layerMask: number = ALL_LAYERS, ignoredEntities?: Set<Entity>): RaycastHit | null {
    const hits = this.raycastAll(world, ray, layerMask, ignoredEntities);
    return hits.length > 0 ? hits[0] : null;
  }

  /**
   * Performs a raycast and returns all intersections sorted by distance.
   *
   * @param world - The ECS world.
   * @param ray - The ray definition.
   * @param layerMask - Bitmask for collision layers.
   * @param ignoredEntities - Entities to exclude from results.
   * @returns Array of {@link RaycastHit} objects.
   */
  static raycastAll(world: World, ray: Ray, layerMask: number = ALL_LAYERS, ignoredEntities?: Set<Entity>): RaycastHit[] {
    const entities = world.query("Transform", "Collider2D");
    const results: RaycastHit[] = [];

    for (const entity of entities) {
      if (ignoredEntities?.has(entity)) continue;
      const collider = world.getComponent<Collider2DComponent>(entity, "Collider2D")!;
      if (!collider.enabled || (collider.layer & layerMask) === 0) continue;

      const transform = world.getComponent<TransformComponent>(entity, "Transform")!;
      const worldX = (transform.worldX ?? transform.x) + collider.offsetX;
      const worldY = (transform.worldY ?? transform.y) + collider.offsetY;
      const rotation = transform.worldRotation ?? transform.rotation;

      let hit: { t: number, nx: number, ny: number } | null = null;
      if (collider.shape.type === "circle") hit = RaycastTests.rayVsCircle(ray, worldX, worldY, collider.shape.radius);
      else if (collider.shape.type === "aabb") hit = RaycastTests.rayVsAABB(ray, worldX, worldY, collider.shape.halfWidth, collider.shape.halfHeight);
      else if (collider.shape.type === "polygon") hit = RaycastTests.rayVsPolygon(ray, collider.shape.vertices, worldX, worldY, rotation);

      if (hit) {
        results.push({
          entity, pointX: ray.originX + ray.directionX * hit.t, pointY: ray.originY + ray.directionY * hit.t,
          normalX: hit.nx, normalY: hit.ny, distance: hit.t, fraction: hit.t / ray.maxDistance
        });
      }
    }
    return results.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Finds all entities whose colliders contain the specified point.
   *
   * @param world - The ECS world.
   * @param x - [px] Point X coordinate.
   * @param y - [px] Point Y coordinate.
   * @param layerMask - Bitmask for collision layers.
   * @returns Array of matching {@link Entity} IDs.
   */
  static pointQuery(world: World, x: number, y: number, layerMask: number = ALL_LAYERS): Entity[] {
    const entities = world.query("Transform", "Collider2D");
    const results: Entity[] = [];
    const pointShape: Shape = { type: "circle", radius: 0.01 };

    for (const entity of entities) {
      const collider = world.getComponent<Collider2DComponent>(entity, "Collider2D")!;
      if (!collider.enabled || (collider.layer & layerMask) === 0) continue;
      const transform = world.getComponent<TransformComponent>(entity, "Transform")!;
      const manifold = NarrowPhase.test(pointShape, x, y, 0, collider.shape, (transform.worldX ?? transform.x) + collider.offsetX, (transform.worldY ?? transform.y) + collider.offsetY, transform.worldRotation ?? transform.rotation);
      if (manifold.colliding) results.push(entity);
    }
    return results;
  }

  /**
   * Finds all entities overlapping with a circle.
   *
   * @param world - The ECS world.
   * @param x - [px] Circle center X.
   * @param y - [px] Circle center Y.
   * @param radius - [px] Circle radius.
   * @param layerMask - Bitmask for collision layers.
   */
  static overlapCircle(world: World, x: number, y: number, radius: number, layerMask: number = ALL_LAYERS): Entity[] {
      const entities = world.query("Transform", "Collider2D");
      const results: Entity[] = [];
      const queryShape: Shape = { type: "circle", radius };
      for (const entity of entities) {
          const collider = world.getComponent<Collider2DComponent>(entity, "Collider2D")!;
          if (!collider.enabled || (collider.layer & layerMask) === 0) continue;
          const transform = world.getComponent<TransformComponent>(entity, "Transform")!;
          const manifold = NarrowPhase.test(queryShape, x, y, 0, collider.shape, (transform.worldX ?? transform.x) + collider.offsetX, (transform.worldY ?? transform.y) + collider.offsetY, transform.worldRotation ?? transform.rotation);
          if (manifold.colliding) results.push(entity);
      }
      return results;
  }

  /**
   * Finds all entities overlapping with an Axis-Aligned Bounding Box (AABB).
   *
   * @param world - The ECS world.
   * @param x - [px] AABB center X.
   * @param y - [px] AABB center Y.
   * @param hw - [px] Half-width.
   * @param hh - [px] Half-height.
   */
  static overlapAABB(world: World, x: number, y: number, hw: number, hh: number, layerMask: number = ALL_LAYERS): Entity[] {
      const entities = world.query("Transform", "Collider2D");
      const results: Entity[] = [];
      const queryShape: Shape = { type: "aabb", halfWidth: hw, halfHeight: hh };
      for (const entity of entities) {
          const collider = world.getComponent<Collider2DComponent>(entity, "Collider2D")!;
          if (!collider.enabled || (collider.layer & layerMask) === 0) continue;
          const transform = world.getComponent<TransformComponent>(entity, "Transform")!;
          const manifold = NarrowPhase.test(queryShape, x, y, 0, collider.shape, (transform.worldX ?? transform.x) + collider.offsetX, (transform.worldY ?? transform.y) + collider.offsetY, transform.worldRotation ?? transform.rotation);
          if (manifold.colliding) results.push(entity);
      }
      return results;
  }

  /**
   * Casts a shape along a ray and returns the first hit.
   *
   * @remarks
   * [Inference] Implemented via discrete sampling. The accuracy depends on the
   * number of internal steps (currently fixed at 15).
   *
   * @param world - The ECS world.
   * @param shape - The shape to cast.
   * @param startX - [px] Start X coordinate.
   * @param startY - [px] Start Y coordinate.
   * @param dirX - Normalized direction X.
   * @param dirY - Normalized direction Y.
   * @param maxDistance - [px] Maximum travel distance.
   */
  static shapeCast(world: World, shape: Shape, startX: number, startY: number, dirX: number, dirY: number, maxDistance: number, layerMask: number = ALL_LAYERS, ignoredEntities?: Set<Entity>): RaycastHit | null {
      const steps = 15; const stepDist = maxDistance / steps;
      for (let i = 0; i <= steps; i++) {
          const curX = startX + dirX * stepDist * i; const curY = startY + dirY * stepDist * i;
          const entities = world.query("Transform", "Collider2D");
          for (const entity of entities) {
              if (ignoredEntities?.has(entity)) continue;
              const collider = world.getComponent<Collider2DComponent>(entity, "Collider2D")!;
              if (!collider.enabled || (collider.layer & layerMask) === 0) continue;
              const transform = world.getComponent<TransformComponent>(entity, "Transform")!;
              const manifold = NarrowPhase.test(shape, curX, curY, 0, collider.shape, (transform.worldX ?? transform.x) + collider.offsetX, (transform.worldY ?? transform.y) + collider.offsetY, transform.worldRotation ?? transform.rotation);
              if (manifold.colliding) return { entity, pointX: curX, pointY: curY, normalX: manifold.normalX, normalY: manifold.normalY, distance: stepDist * i, fraction: (stepDist * i) / maxDistance };
          }
      }
      return null;
  }
}
