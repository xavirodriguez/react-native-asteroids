import { System } from "../../core/System";
import { World } from "../../core/World";
import { Entity, TransformComponent, Collider2DComponent, CollisionEventsComponent, CollisionManifold, ContinuousColliderComponent, VelocityComponent } from "../../types/EngineTypes";
import { BroadPhase } from "./BroadPhase";
import { NarrowPhase } from "./NarrowPhase";
import { ContinuousCollision, CCDResult } from "./ContinuousCollision";
import { SpatialHash } from "../../collision/SpatialHash";

export type CollisionCallback = (world: World, entityA: Entity, entityB: Entity, manifold: CollisionManifold) => void;
export type TriggerCallback = (world: World, entityA: Entity, entityB: Entity) => void;

/**
 * Comprehensive 2D collision detection system.
 *
 * @responsibility Hybrid broad-phase selection, Narrow-phase detection (AABB/Circle), and Continuous Collision Detection (CCD).
 *
 * @conceptualRisk [MUTATION_SAFETY] Collision/trigger callbacks are executed during world iteration.
 * Handlers that add/remove entities or components may lead to inconsistent world states or iteration errors.
 * @conceptualRisk [SPATIAL_HASH_TUNING] Broad-phase performance is highly sensitive to cell size versus entity density.
 *
 * @mutates {@link CollisionEventsComponent} - Clears and repopulates per-frame event buffers.
 * @mutates {@link TransformComponent} - May adjust positions when CCD triggers early time-of-impact (TOI) steps.
 *
 * @emits Collision manifold data and Trigger lifecycle events (Enter, Stay, Exit).
 */
export class CollisionSystem2D extends System {
  private onCollisionCallbacks: CollisionCallback[] = [];
  private onTriggerEnterCallbacks: TriggerCallback[] = [];
  private onTriggerExitCallbacks: TriggerCallback[] = [];
  private activePairs = new Set<string>();
  private spatialHash: SpatialHash | null = null;

  useSpatialHash(cellSize: number): void { this.spatialHash = new SpatialHash(cellSize); }
  onCollision(callback: CollisionCallback): void { this.onCollisionCallbacks.push(callback); }
  onTriggerEnter(callback: TriggerCallback): void { this.onTriggerEnterCallbacks.push(callback); }
  onTriggerExit(callback: TriggerCallback): void { this.onTriggerExitCallbacks.push(callback); }

  /**
   * Orchestrates the collision detection pipeline.
   *
   * @remarks
   * 1. Resets per-frame collision/trigger events.
   *
   * 2. Selects Broad-phase (Spatial Hash for \>50 entities, otherwise Sweep and Prune).
   *
   * 3. Performs Continuous Collision Detection (CCD) for enabled entities.
   *
   * 4. Executes Narrow-phase tests to generate collision manifolds.
   *
   * 5. Notifies callbacks and populates event components.
   *
   * @param world - The ECS world instance.
   * @param _deltaTime - Time elapsed in milliseconds.
   */
  update(world: World, _deltaTime: number): void {
    const entities = world.query("Transform", "Collider2D");
    const currentFramePairs = new Set<string>();
    const eventEntities = world.query("CollisionEvents");
    eventEntities.forEach(entity => {
      const events = world.getComponent<CollisionEventsComponent>(entity, "CollisionEvents")!;
      events.collisions.length = 0; events.triggersEntered.length = 0; events.triggersExited.length = 0;
    });

    let candidates: Array<[Entity, Entity]>;
    if (this.spatialHash && entities.length > 50) {
      this.spatialHash.clear();
      const entityBoundsMap = new Map<Entity, any>();
      entities.forEach(entity => {
        const bounds = BroadPhase.getShapeBounds(world.getComponent<TransformComponent>(entity, "Transform")!, world.getComponent<Collider2DComponent>(entity, "Collider2D")!);
        entityBoundsMap.set(entity, bounds);
        this.spatialHash!.insert(entity, bounds);
      });
      candidates = [];
      entities.forEach(entityA => {
        const boundsA = entityBoundsMap.get(entityA);
        const potentials = new Set<Entity>();
        this.spatialHash!.query(boundsA, potentials);
        potentials.forEach(entityB => {
          if (entityA >= entityB) return;
          candidates.push([entityA, entityB]);
        });
      });
    } else {
      candidates = BroadPhase.sweepAndPrune(entities, world);
    }

    for (const [entityA, entityB] of candidates) {
      const colA = world.getComponent<Collider2DComponent>(entityA, "Collider2D")!;
      const colB = world.getComponent<Collider2DComponent>(entityB, "Collider2D")!;
      if (!colA.enabled || !colB.enabled) continue;
      if (!this.shouldCollide(colA, colB)) continue;

      const transA = world.getComponent<TransformComponent>(entityA, "Transform")!;
      const transB = world.getComponent<TransformComponent>(entityB, "Transform")!;
      const ccdA = world.getComponent<ContinuousColliderComponent>(entityA, "ContinuousCollider");
      const velA = world.getComponent<VelocityComponent>(entityA, "Velocity");

      if (ccdA?.enabled && velA) {
          const dtSeconds = _deltaTime / 1000;
          let ccdResult: CCDResult | null = null;
          const ax = (transA.worldX ?? transA.x) + colA.offsetX;
          const ay = (transA.worldY ?? transA.y) + colA.offsetY;
          const bx = (transB.worldX ?? transB.x) + colB.offsetX;
          const by = (transB.worldY ?? transB.y) + colB.offsetY;

          if (colA.shape.type === "circle") {
              if (colB.shape.type === "circle") ccdResult = ContinuousCollision.sweptCircleVsCircle(ax, ay, velA.dx, velA.dy, colA.shape.radius, bx, by, colB.shape.radius, dtSeconds);
              else if (colB.shape.type === "aabb") ccdResult = ContinuousCollision.sweptCircleVsAABB(ax, ay, velA.dx, velA.dy, colA.shape.radius, bx, by, colB.shape.halfWidth, colB.shape.halfHeight, dtSeconds);
          } else if (colA.shape.type === "aabb" && colB.shape.type === "aabb") {
              ccdResult = ContinuousCollision.sweptAABBVsAABB(ax, ay, velA.dx, velA.dy, colA.shape.halfWidth, colA.shape.halfHeight, bx, by, colB.shape.halfWidth, colB.shape.halfHeight, dtSeconds);
          }

          if (ccdResult?.hit && ccdResult.timeOfImpact < 1) {
              transA.x += velA.dx * dtSeconds * ccdResult.timeOfImpact;
              transA.y += velA.dy * dtSeconds * ccdResult.timeOfImpact;
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
            this.onTriggerEnterCallbacks.forEach(cb => cb(world, entityA, entityB));
            this.notifyTriggerEvent(world, entityA, entityB, "enter");
          }
          this.notifyTriggerEvent(world, entityA, entityB, "stay");
        } else {
          this.onCollisionCallbacks.forEach(cb => cb(world, entityA, entityB, manifold));
          this.notifyCollisionEvent(world, entityA, entityB, manifold);
        }
      }
    }

    this.activePairs.forEach(pairId => {
      if (!currentFramePairs.has(pairId)) {
        const [idA, idB] = pairId.split(",").map(Number);
        this.onTriggerExitCallbacks.forEach(cb => cb(world, idA, idB));
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
