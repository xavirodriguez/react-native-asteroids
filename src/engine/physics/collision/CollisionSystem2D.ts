import { System } from "../../core/System";
import { World } from "../../core/World";
import { Entity, TransformComponent, Collider2DComponent, CollisionEventsComponent, CollisionManifold, CoreComponentRegistry } from "../../core/CoreComponents";
import { BroadPhase } from "./BroadPhase";
import { NarrowPhase } from "./NarrowPhase";
import { SpatialGrid } from "../utils/SpatialGrid";
import { ComponentRegistry } from "../../core/Component";
import { EventRegistry } from "../../core/EventBus";

/**
 * Signature for collision response callbacks.
 */
export type CollisionCallback<TComponents extends ComponentRegistry, TEvents extends EventRegistry> =
  (world: World<TComponents, TEvents, any>, entityA: Entity, entityB: Entity, manifold: CollisionManifold) => void;

/**
 * Signature for trigger state change callbacks.
 */
export type TriggerCallback<TComponents extends ComponentRegistry, TEvents extends EventRegistry> =
  (world: World<TComponents, TEvents, any>, entityA: Entity, entityB: Entity) => void;

/**
 * Hybrid 2D Collision System.
 */
export class CollisionSystem2D<
  TComponents extends ComponentRegistry = CoreComponentRegistry,
  TEvents extends EventRegistry = any
> extends System<TComponents, TEvents> {
  private onCollisionCallbacks: CollisionCallback<TComponents, TEvents>[] = [];
  private onTriggerEnterCallbacks: TriggerCallback<TComponents, TEvents>[] = [];
  private onTriggerExitCallbacks: TriggerCallback<TComponents, TEvents>[] = [];
  private activePairs = new Set<string>();
  private _useSpatialGrid = false;
  private _potentialBSet = new Set<Entity>();

  /**
   * Enables the use of a global Spatial Grid for optimized broadphase queries.
   */
  useSpatialHash(_cellSize: number): void { this._useSpatialGrid = true; }

  /** Registers a callback for physical collisions. */
  onCollision(callback: CollisionCallback<TComponents, TEvents>): void { this.onCollisionCallbacks.push(callback); }
  /** Registers a callback for when an entity enters a trigger. */
  onTriggerEnter(callback: TriggerCallback<TComponents, TEvents>): void { this.onTriggerEnterCallbacks.push(callback); }
  /** Registers a callback for when an entity leaves a trigger. */
  onTriggerExit(callback: TriggerCallback<TComponents, TEvents>): void { this.onTriggerExitCallbacks.push(callback); }

  update(world: World<TComponents, TEvents, any>, _deltaTime: number): void {
    const query = world.query("Transform" as any, "Collider2D" as any);
    const currentFramePairs = new Set<string>();
    const eventQuery = world.query("CollisionEvents" as any);

    for (const entity of eventQuery) {
      world.mutateComponent(entity, "CollisionEvents" as any, (events: any) => {
          const e = events as CollisionEventsComponent;
          e.collisions.length = 0;
          e.triggersEntered.length = 0;
          e.triggersExited.length = 0;
      });
    }

    let candidates: Array<[Entity, Entity]>;
    const grid = world.getResource<SpatialGrid>("SpatialGrid");

    if (this._useSpatialHash(world) && grid) {
      const entityBoundsMap = new Map<Entity, import("../../types/CommonTypes").AABB>();
      for (const entity of query) {
        const bounds = BroadPhase.getShapeBounds(world.getComponent(entity, "Transform" as any) as any as TransformComponent, world.getComponent(entity, "Collider2D" as any) as any as Collider2DComponent);
        entityBoundsMap.set(entity, bounds);

        if (!world.hasComponent(entity, "SpatialNode" as any)) {
            grid.insert(entity, bounds);
        }
      }
      candidates = [];
      for (const entityA of query) {
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
      candidates = BroadPhase.sweepAndPrune([...query], world as any);
    }

    for (const [entityA, entityB] of candidates) {
      const colA = world.getComponent(entityA, "Collider2D" as any) as any as Collider2DComponent;
      const colB = world.getComponent(entityB, "Collider2D" as any) as any as Collider2DComponent;
      if (!colA || !colB || !colA.enabled || !colB.enabled) continue;
      if (!this.shouldCollide(colA, colB)) continue;

      const transA = world.getComponent(entityA, "Transform" as any) as any as TransformComponent;
      const transB = world.getComponent(entityB, "Transform" as any) as any as TransformComponent;

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

  private _useSpatialHash(world: World<any, any, any>): boolean {
    return this._useSpatialGrid;
  }

  private shouldCollide(a: Collider2DComponent, b: Collider2DComponent): boolean { return (a.layer & b.mask) !== 0 && (b.layer & a.mask) !== 0; }
  private getPairId(a: Entity, b: Entity): string { return a < b ? `${a},${b}` : `${b},${a}`; }
  private notifyCollisionEvent(world: World<TComponents, TEvents, any>, a: Entity, b: Entity, manifold: CollisionManifold): void { this.addCollisionToComponent(world, a, b, manifold, false); this.addCollisionToComponent(world, b, a, manifold, true); }
  private addCollisionToComponent(world: World<TComponents, TEvents, any>, entity: Entity, other: Entity, manifold: CollisionManifold, flipNormal: boolean): void {
    const commands = world.getCommandBuffer();
    const events = world.getComponent(entity, "CollisionEvents" as any) as any as CollisionEventsComponent;
    if (!events) {
        commands.addComponent(entity, { type: "CollisionEvents", collisions: [], activeTriggers: [], triggersEntered: [], triggersExited: [] } as any);
        return;
    }
    world.mutateComponent(entity, "CollisionEvents" as any, (eComp: any) => {
        const e = eComp as CollisionEventsComponent;
        e.collisions.push({ otherEntity: other, normalX: flipNormal ? -manifold.normalX : manifold.normalX, normalY: flipNormal ? -manifold.normalY : manifold.normalY, depth: manifold.depth, contactPoints: manifold.contactPoints });
    });
  }
  private notifyTriggerEvent(world: World<TComponents, TEvents, any>, a: Entity, b: Entity, phase: "enter" | "stay" | "exit"): void { this.addTriggerToComponent(world, a, b, phase); this.addTriggerToComponent(world, b, a, phase); }
  private addTriggerToComponent(world: World<TComponents, TEvents, any>, entity: Entity, other: Entity, phase: "enter" | "stay" | "exit"): void {
    const commands = world.getCommandBuffer();
    const events = world.getComponent(entity, "CollisionEvents" as any) as any as CollisionEventsComponent;
    if (!events) {
        commands.addComponent(entity, { type: "CollisionEvents", collisions: [], activeTriggers: [], triggersEntered: [], triggersExited: [] } as any);
        return;
    }
    world.mutateComponent(entity, "CollisionEvents" as any, (eComp: any) => {
        const e = eComp as CollisionEventsComponent;
        if (phase === "enter") { e.triggersEntered.push(other); e.activeTriggers.push(other); }
        else if (phase === "stay") { if (!e.activeTriggers.includes(other)) e.activeTriggers.push(other); }
        else if (phase === "exit") { e.triggersExited.push(other); e.activeTriggers = e.activeTriggers.filter(id => id !== other); }
    });
  }
}
