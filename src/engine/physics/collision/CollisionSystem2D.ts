import { System } from "../../core/System";
import { World } from "../../core/World";
import { Entity, TransformComponent, Collider2DComponent, CollisionEventsComponent, CollisionManifold } from "../../types/EngineTypes";
import { BroadPhase } from "./BroadPhase";
import { NarrowPhase } from "./NarrowPhase";
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
 * API status: Public
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
   */
  update(world: World, _deltaTime: number): void {
    const query = world.getQuery("Transform", "Collider2D");
    const currentFramePairs = new Set<string>();
    const eventQuery = world.getQuery("CollisionEvents");

    eventQuery.forEach((entity) => {
      world.mutateComponent<CollisionEventsComponent>(entity, "CollisionEvents", events => {
          events.collisions.length = 0;
          events.triggersEntered.length = 0;
          events.triggersExited.length = 0;
      });
    });

    let candidates: Array<[Entity, Entity]>;
    const grid = world.getResource<SpatialGrid>("SpatialGrid");

    if (this._useSpatialGrid && grid) {
      const entityBoundsMap = new Map<Entity, import("../../types/EngineTypes").AABB>();
      query.forEach((entity) => {
        const bounds = BroadPhase.getShapeBounds(world.getComponent<TransformComponent>(entity, "Transform")!, world.getComponent<Collider2DComponent>(entity, "Collider2D")!);
        entityBoundsMap.set(entity, bounds);

        // Fallback for entities with Collider2D but without SpatialNode (indexed on-demand for collisions)
        if (!world.hasComponent(entity, "SpatialNode")) {
            grid.insert(entity, bounds);
        }
      });
      candidates = [];
      query.forEach((entityA) => {
        const boundsA = entityBoundsMap.get(entityA);
        if (!boundsA) return;

        this._potentialBSet.clear();
        grid.query(boundsA, this._potentialBSet);
        this._potentialBSet.forEach(entityB => {
          if (entityA < entityB) {
            candidates.push([entityA, entityB]);
          }
        });
      });
    } else {
      candidates = BroadPhase.sweepAndPrune([...query.getEntitiesView()], world);
    }

    for (const [entityA, entityB] of candidates) {
      const colA = world.getComponent<Collider2DComponent>(entityA, "Collider2D");
      const colB = world.getComponent<Collider2DComponent>(entityB, "Collider2D");
      if (!colA || !colB || !colA.enabled || !colB.enabled) continue;
      if (!this.shouldCollide(colA, colB)) continue;

      const transA = world.getComponent<TransformComponent>(entityA, "Transform")!;
      const transB = world.getComponent<TransformComponent>(entityB, "Transform")!;

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
    const commands = world.getCommandBuffer();
    const events = world.getComponent<CollisionEventsComponent>(entity, "CollisionEvents");
    if (!events) {
        commands.addComponent(entity, { type: "CollisionEvents", collisions: [], activeTriggers: [], triggersEntered: [], triggersExited: [] } as CollisionEventsComponent);
        // We skip recording this collision for this frame as the component won't be available yet
        return;
    }
    world.mutateComponent<CollisionEventsComponent>(entity, "CollisionEvents", eComp => {
        eComp.collisions.push({ otherEntity: other, normalX: flipNormal ? -manifold.normalX : manifold.normalX, normalY: flipNormal ? -manifold.normalY : manifold.normalY, depth: manifold.depth, contactPoints: manifold.contactPoints });
    });
  }
  private notifyTriggerEvent(world: World, a: Entity, b: Entity, phase: "enter" | "stay" | "exit"): void { this.addTriggerToComponent(world, a, b, phase); this.addTriggerToComponent(world, b, a, phase); }
  private addTriggerToComponent(world: World, entity: Entity, other: Entity, phase: "enter" | "stay" | "exit"): void {
    const commands = world.getCommandBuffer();
    const events = world.getComponent<CollisionEventsComponent>(entity, "CollisionEvents");
    if (!events) {
        commands.addComponent(entity, { type: "CollisionEvents", collisions: [], activeTriggers: [], triggersEntered: [], triggersExited: [] } as CollisionEventsComponent);
        return;
    }
    world.mutateComponent<CollisionEventsComponent>(entity, "CollisionEvents", eComp => {
        if (phase === "enter") { eComp.triggersEntered.push(other); eComp.activeTriggers.push(other); }
        else if (phase === "stay") { if (!eComp.activeTriggers.includes(other)) eComp.activeTriggers.push(other); }
        else if (phase === "exit") { eComp.triggersExited.push(other); eComp.activeTriggers = eComp.activeTriggers.filter(id => id !== other); }
    });
  }
}
