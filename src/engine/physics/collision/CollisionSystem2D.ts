import { System } from "../../core/System";
import { World } from "../../core/World";
import { Entity, TransformComponent, Collider2DComponent, CollisionEventsComponent, CollisionManifold, ContinuousColliderComponent, VelocityComponent } from "../../types/EngineTypes";
import { BroadPhase } from "./BroadPhase";
import { NarrowPhase } from "./NarrowPhase";
import { ContinuousCollision, CCDResult } from "./ContinuousCollision";
import { SpatialGrid } from "../utils/SpatialGrid";

/**
 * Signature for collision response callbacks.
 */
export type CollisionCallback = (world: World, entityA: Entity, entityB: Entity, manifold: CollisionManifold) => void;
/**
 * Signature for trigger state change callbacks.
 */
export type TriggerCallback = (world: World, entityA: Entity, entityB: Entity) => void;

/**
 * Hybrid 2D Collision System.
 *
 * @responsibility Implement a two-phase collision detection pipeline (Broadphase & Narrowphase).
 * @responsibility Manage lifecycle events for triggers (Enter, Stay, Exit).
 * @responsibility Provide Continuous Collision Detection (CCD) to mitigate tunneling for fast objects.
 *
 * @remarks
 * ### Detection Pipeline:
 * 1. **Broadphase Selection**:
 *    - If `useSpatialHash` is enabled: Queries the `SpatialGrid` resource for O(1) candidate selection.
 *    - Fallback: Uses `Sweep and Prune` (1D sorting) for sparse environments.
 * 2. **CCD Phase**: For entities with `ContinuousColliderComponent`, performs swept tests to
 *    calculate Time of Impact (TOI).
 * 3. **Narrowphase Phase**: Uses `NarrowPhase.test` (SAT/GJK) to generate precise {@link CollisionManifold}s.
 * 4. **Event Dispatch**: Populates {@link CollisionEventsComponent} and executes registered callbacks.
 *
 * @warning **Safety**: Do NOT perform structural world changes (entity creation/deletion)
 * inside collision callbacks directly if iterating. Use `world.getCommandBuffer()`.
 *
 * @conceptualRisk [TUNNELING] Fast objects without CCD enabled will skip collisions.
 * @conceptualRisk [STALE_GRID] Relies on `SpatialPartitioningSystem` (USSC) having
 * updated the grid in a previous phase.
 *
 * @public
 */
export class CollisionSystem2D extends System {
  private onCollisionCallbacks: CollisionCallback[] = [];
  private onTriggerEnterCallbacks: TriggerCallback[] = [];
  private onTriggerExitCallbacks: TriggerCallback[] = [];
  private activePairs = new Set<string>();
  private _useSpatialGrid = false;
  private _potentialBSet = new Set<Entity>();

  /**
   * Enables the use of a global Spatial Grid for optimized broadphase queries.
   */
  useSpatialHash(_cellSize: number): void { this._useSpatialGrid = true; }

  /** Registers a callback for physical collisions. */
  onCollision(callback: CollisionCallback): void { this.onCollisionCallbacks.push(callback); }
  /** Registers a callback for when an entity enters a trigger. */
  onTriggerEnter(callback: TriggerCallback): void { this.onTriggerEnterCallbacks.push(callback); }
  /** Registers a callback for when an entity leaves a trigger. */
  onTriggerExit(callback: TriggerCallback): void { this.onTriggerExitCallbacks.push(callback); }

  /**
   * Orchestrates the collision detection pipeline for the current tick.
   *
   * @param world - The ECS world instance.
   * @param _deltaTime - Time elapsed in milliseconds.
   *
   * @remarks
   * 1. Resets per-frame collision/trigger events on all entities with `CollisionEventsComponent`.
   * 2. Selects Broad-phase candidates.
   * 3. Performs CCD for enabled entities, moving them to their Time of Impact (TOI).
   * 4. Executes Narrow-phase tests.
   * 5. Notifies callbacks and populates event components.
   */
  update(world: World, _deltaTime: number): void {
    const entities = world.query("Transform", "Collider2D");
    const currentFramePairs = new Set<string>();
    const eventEntities = world.query("CollisionEvents");
    for (let i = 0; i < eventEntities.length; i++) {
      const entity = eventEntities[i];
      const events = world.getComponent<CollisionEventsComponent>(entity, "CollisionEvents")!;
      events.collisions.length = 0; events.triggersEntered.length = 0; events.triggersExited.length = 0;
    }

    let candidates: Array<[Entity, Entity]>;
    const grid = world.getResource<SpatialGrid>("SpatialGrid");

    if (this._useSpatialGrid && grid) {
      const entityBoundsMap = new Map<Entity, import("../../types/EngineTypes").AABB>();
      for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        const bounds = BroadPhase.getShapeBounds(world.getComponent<TransformComponent>(entity, "Transform")!, world.getComponent<Collider2DComponent>(entity, "Collider2D")!);
        entityBoundsMap.set(entity, bounds);

        // Fallback for entities with Collider2D but without SpatialNode (indexed on-demand for collisions)
        if (!world.hasComponent(entity, "SpatialNode")) {
            grid.insert(entity, bounds);
        }
      }
      candidates = [];
      for (let i = 0; i < entities.length; i++) {
        const entityA = entities[i];
        const boundsA = entityBoundsMap.get(entityA);
        if (!boundsA) continue;

        this._potentialBSet.clear();
        grid.query(boundsA, this._potentialBSet);
        this._potentialBSet.forEach(entityB => {
          if (entityA < entityB) {
            candidates.push([entityA, entityB]);
          }
        });
      }
    } else {
      candidates = BroadPhase.sweepAndPrune([...entities], world);
    }

    for (const [entityA, entityB] of candidates) {
      const colA = world.getComponent<Collider2DComponent>(entityA, "Collider2D");
      const colB = world.getComponent<Collider2DComponent>(entityB, "Collider2D");
      if (!colA || !colB || !colA.enabled || !colB.enabled) continue;
      if (!this.shouldCollide(colA, colB)) continue;

      const transA = world.getComponent<TransformComponent>(entityA, "Transform")!;
      const transB = world.getComponent<TransformComponent>(entityB, "Transform")!;
      const ccdA = world.getComponent<ContinuousColliderComponent>(entityA, "ContinuousCollider");
      const ccdB = world.getComponent<ContinuousColliderComponent>(entityB, "ContinuousCollider");
      const velA = world.getComponent<VelocityComponent>(entityA, "Velocity");
      const velB = world.getComponent<VelocityComponent>(entityB, "Velocity");

      // Continuous Collision Detection (CCD)
      if ((ccdA?.enabled || ccdB?.enabled)) {
          const velX = (velA?.dx ?? 0) - (velB?.dx ?? 0);
          const velY = (velA?.dy ?? 0) - (velB?.dy ?? 0);
          const relativeSpeedSq = velX * velX + velY * velY;

          const thresholdA = ccdA?.velocityThreshold ?? 0;
          const thresholdB = ccdB?.velocityThreshold ?? 0;
          const minThreshold = (ccdA?.enabled && ccdB?.enabled)
            ? Math.min(thresholdA, thresholdB)
            : (ccdA?.enabled ? thresholdA : thresholdB);

          if (relativeSpeedSq > minThreshold * minThreshold) {
              const dtSeconds = _deltaTime / 1000;
              let ccdResult: CCDResult | null = null;
          const ax = (transA.worldX ?? transA.x) + colA.offsetX;
          const ay = (transA.worldY ?? transA.y) + colA.offsetY;
          const bx = (transB.worldX ?? transB.x) + colB.offsetX;
          const by = (transB.worldY ?? transB.y) + colB.offsetY;

          if (colA.shape.type === "circle") {
              if (colB.shape.type === "circle") ccdResult = ContinuousCollision.sweptCircleVsCircle(ax, ay, velX, velY, colA.shape.radius, bx, by, colB.shape.radius, dtSeconds);
              else if (colB.shape.type === "aabb") ccdResult = ContinuousCollision.sweptCircleVsAABB(ax, ay, velX, velY, colA.shape.radius, bx, by, colB.shape.halfWidth, colB.shape.halfHeight, dtSeconds);
          } else if (colA.shape.type === "aabb" && colB.shape.type === "aabb") {
              ccdResult = ContinuousCollision.sweptAABBVsAABB(ax, ay, velX, velY, colA.shape.halfWidth, colA.shape.halfHeight, bx, by, colB.shape.halfWidth, colB.shape.halfHeight, dtSeconds);
          }

              if (ccdResult?.hit && ccdResult.timeOfImpact < 1) {
                  // Resolve by moving both entities to TOI
                  if (velA) {
                      const moveX = velA.dx * dtSeconds * ccdResult.timeOfImpact;
                      const moveY = velA.dy * dtSeconds * ccdResult.timeOfImpact;
                      world.mutateComponent(entityA, "Transform", t => {
                        t.x += moveX;
                        t.y += moveY;
                      });
                  }
                  if (velB) {
                      const moveX = velB.dx * dtSeconds * ccdResult.timeOfImpact;
                      const moveY = velB.dy * dtSeconds * ccdResult.timeOfImpact;
                      world.mutateComponent(entityB, "Transform", t => {
                        t.x += moveX;
                        t.y += moveY;
                      });
                  }
              }
          }
      }

      const manifold = NarrowPhase.test(
        colA.shape, (transA.worldX ?? transA.x) + colA.offsetX, (transA.worldY ?? transA.y) + colA.offsetY, transA.worldRotation ?? transA.rotation,
        colB.shape, (transB.worldX ?? transB.x) + colB.offsetX, (transB.worldY ?? transB.y) + colB.offsetY, transB.worldRotation ?? transB.rotation
      );

      if (manifold.colliding) {
        const pairId = this.getPairId(entityA, entityB);
        currentFramePairs.add(pairId);
        if (colA.isTrigger || colB.isTrigger) {
          if (!this.activePairs.has(pairId)) {
            for (let j = 0; j < this.onTriggerEnterCallbacks.length; j++) {
              this.onTriggerEnterCallbacks[j](world, entityA, entityB);
            }
            this.notifyTriggerEvent(world, entityA, entityB, "enter");
          }
          this.notifyTriggerEvent(world, entityA, entityB, "stay");
        } else {
          for (let j = 0; j < this.onCollisionCallbacks.length; j++) {
            this.onCollisionCallbacks[j](world, entityA, entityB, manifold);
          }
          this.notifyCollisionEvent(world, entityA, entityB, manifold);
        }
      }
    }

    this.activePairs.forEach(pairId => {
      if (!currentFramePairs.has(pairId)) {
        const [idA, idB] = pairId.split(",").map(Number);
        for (let j = 0; j < this.onTriggerExitCallbacks.length; j++) {
          this.onTriggerExitCallbacks[j](world, idA, idB);
        }
        this.notifyTriggerEvent(world, idA, idB, "exit");
      }
    });
    this.activePairs = currentFramePairs;
  }

  private shouldCollide(a: Collider2DComponent, b: Collider2DComponent): boolean { return (a.layer & b.mask) !== 0 && (b.layer & a.mask) !== 0; }
  private getPairId(a: Entity, b: Entity): string { return a < b ? `${a},${b}` : `${b},${a}`; }
  private notifyCollisionEvent(world: World, a: Entity, b: Entity, manifold: CollisionManifold): void { this.addCollisionToComponent(world, a, b, manifold, false); this.addCollisionToComponent(world, b, a, manifold, true); }
  private addCollisionToComponent(world: World, entity: Entity, other: Entity, manifold: CollisionManifold, flipNormal: boolean): void {
    let events = world.getComponent<CollisionEventsComponent>(entity, "CollisionEvents");
    if (!events) { events = { type: "CollisionEvents", collisions: [], activeTriggers: [], triggersEntered: [], triggersExited: [] }; world.addComponent(entity, events); }
    events.collisions.push({ otherEntity: other, normalX: flipNormal ? -manifold.normalX : manifold.normalX, normalY: flipNormal ? -manifold.normalY : manifold.normalY, depth: manifold.depth, contactPoints: manifold.contactPoints });
  }
  private notifyTriggerEvent(world: World, a: Entity, b: Entity, phase: "enter" | "stay" | "exit"): void { this.addTriggerToComponent(world, a, b, phase); this.addTriggerToComponent(world, b, a, phase); }
  private addTriggerToComponent(world: World, entity: Entity, other: Entity, phase: "enter" | "stay" | "exit"): void {
    let events = world.getComponent<CollisionEventsComponent>(entity, "CollisionEvents");
    if (!events) { events = { type: "CollisionEvents", collisions: [], activeTriggers: [], triggersEntered: [], triggersExited: [] }; world.addComponent(entity, events); }
    if (phase === "enter") { events.triggersEntered.push(other); events.activeTriggers.push(other); }
    else if (phase === "stay") { if (!events.activeTriggers.includes(other)) events.activeTriggers.push(other); }
    else if (phase === "exit") { events.triggersExited.push(other); events.activeTriggers = events.activeTriggers.filter(id => id !== other); }
  }
}
