import { World } from "../../core/World";
import { Entity, Collider2DComponent, TransformComponent, Shape } from "../../types/EngineTypes";
import { Ray, RaycastHit } from "./QueryTypes";
import { RaycastTests } from "./RaycastTests";
import { ALL_LAYERS } from "../collision/CollisionLayers";
import { NarrowPhase } from "../collision/NarrowPhase";

export class PhysicsQuery {
  static raycast(world: World, ray: Ray, layerMask: number = ALL_LAYERS, ignoredEntities?: Set<Entity>): RaycastHit | null {
    const hits = this.raycastAll(world, ray, layerMask, ignoredEntities);
    return hits.length > 0 ? hits[0] : null;
  }

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
