import { World } from "../../ecs/World";
import { System } from "../../ecs/System";
import { ComponentRegistry } from "../../ecs/Component";
import { Entity } from "../../ecs/Entity";
import { CollisionManifold, Collision } from "./CollisionTypes";
import { BroadPhase } from "./BroadPhase";
import { NarrowPhase } from "./NarrowPhase";
import { ColliderComponent, TransformComponent, CollisionEventsComponent } from "../../ecs/CoreComponents";

export type CollisionCallback = (world: World<any>, entityA: Entity, entityB: Entity, manifold: CollisionManifold) => void;
export type TriggerCallback = (world: World<any>, entityA: Entity, entityB: Entity) => void;

/**
 * Basic 2D Collision System.
 */
export class CollisionSystem2D<TRegistry extends ComponentRegistry = any> extends System<TRegistry> {
  private onCollisionCallbacks: CollisionCallback[] = [];
  private onTriggerEnterCallbacks: TriggerCallback[] = [];
  private onTriggerExitCallbacks: TriggerCallback[] = [];
  private activePairs = new Set<string>();

  public onCollision(callback: CollisionCallback): void { this.onCollisionCallbacks.push(callback); }
  public onTriggerEnter(callback: TriggerCallback): void { this.onTriggerEnterCallbacks.push(callback); }
  public onTriggerExit(callback: TriggerCallback): void { this.onTriggerExitCallbacks.push(callback); }

  public update(world: World<TRegistry>, deltaTime: number): void {
    const query = world.query("Transform" as any, "Collider" as any);
    const currentFramePairs = new Set<string>();

    // Clear previous frame events
    const eventQuery = world.query("CollisionEvents" as any);
    for (const entity of eventQuery) {
      world.mutateComponent(entity, "CollisionEvents" as any, (events: any) => {
        events.collisions.length = 0;
        events.triggersEntered.length = 0;
        events.triggersExited.length = 0;
      });
    }

    const candidates = BroadPhase.sweepAndPrune([...query], world);

    for (const [entityA, entityB] of candidates) {
      const colA = world.getComponent(entityA, "Collider" as any) as unknown as ColliderComponent;
      const colB = world.getComponent(entityB, "Collider" as any) as unknown as ColliderComponent;

      if (!colA || !colB || !colA.enabled || !colB.enabled) continue;
      if (!this.shouldCollide(colA, colB)) continue;

      const transA = world.getComponent(entityA, "Transform" as any) as unknown as TransformComponent;
      const transB = world.getComponent(entityB, "Transform" as any) as unknown as TransformComponent;

      const manifold = NarrowPhase.test(
        colA.shape, (transA.worldX ?? transA.x) + (colA.offsetX ?? 0), (transA.worldY ?? transA.y) + (colA.offsetY ?? 0), transA.worldRotation ?? transA.rotation,
        colB.shape, (transB.worldX ?? transB.x) + (colB.offsetX ?? 0), (transB.worldY ?? transB.y) + (colB.offsetY ?? 0), transB.worldRotation ?? transB.rotation
      );

      if (manifold.colliding) {
        const pairId = this.getPairId(entityA, entityB);
        currentFramePairs.add(pairId);

        if (colA.isTrigger || colB.isTrigger) {
          if (!this.activePairs.has(pairId)) {
            this.onTriggerEnterCallbacks.forEach(cb => cb(world, entityA, entityB));
            this.notifyTriggerEvent(world, entityA, entityB, "enter");
          }
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

  private shouldCollide(a: ColliderComponent, b: ColliderComponent): boolean {
    return (a.layer & b.mask) !== 0 && (b.layer & a.mask) !== 0;
  }

  private getPairId(a: Entity, b: Entity): string {
    return a < b ? `${a},${b}` : `${b},${a}`;
  }

  private notifyCollisionEvent(world: World<any>, a: Entity, b: Entity, manifold: CollisionManifold): void {
    this.addCollisionToComponent(world, a, b, manifold, false);
    this.addCollisionToComponent(world, b, a, manifold, true);
  }

  private addCollisionToComponent(world: World<any>, entity: Entity, other: Entity, manifold: CollisionManifold, flipNormal: boolean): void {
    const events = world.getComponent(entity, "CollisionEvents" as any);
    if (!events) return;

    world.mutateComponent(entity, "CollisionEvents" as any, (eComp: any) => {
      eComp.collisions.push({
        otherEntity: other,
        normalX: flipNormal ? -manifold.normalX : manifold.normalX,
        normalY: flipNormal ? -manifold.normalY : manifold.normalY,
        depth: manifold.depth,
        contactPoints: manifold.contactPoints
      });
    });
  }

  private notifyTriggerEvent(world: World<any>, a: Entity, b: Entity, phase: "enter" | "exit"): void {
    this.addTriggerToComponent(world, a, b, phase);
    this.addTriggerToComponent(world, b, a, phase);
  }

  private addTriggerToComponent(world: World<any>, entity: Entity, other: Entity, phase: "enter" | "exit"): void {
    const events = world.getComponent(entity, "CollisionEvents" as any);
    if (!events) return;

    world.mutateComponent(entity, "CollisionEvents" as any, (eComp: any) => {
      if (phase === "enter") {
        eComp.triggersEntered.push(other);
        if (!eComp.activeTriggers.includes(other)) eComp.activeTriggers.push(other);
      } else {
        eComp.triggersExited.push(other);
        eComp.activeTriggers = eComp.activeTriggers.filter((id: number) => id !== other);
      }
    });
  }
}

/**
 * Continuous Collision Detection System.
 */
export class CCDSystem<TRegistry extends ComponentRegistry = any> extends System<TRegistry> {
  public update(world: World<TRegistry>, deltaTime: number): void {
    // CCD logic for fast-moving objects
  }
}
