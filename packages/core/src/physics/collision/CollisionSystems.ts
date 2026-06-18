import { World, ComponentType } from "../../ecs/World";
import { System } from "../../ecs/System";
import { ComponentRegistry } from "../../ecs/Component";
import { Entity } from "../../ecs/Entity";
import { CollisionManifold, Collision } from "./CollisionTypes";
import { BroadPhase } from "./BroadPhase";
import { NarrowPhase } from "./NarrowPhase";
import { ColliderComponent, TransformComponent, CollisionEventsComponent, CoreComponentRegistry } from "../../ecs/CoreComponents";

export type CollisionCallback<TRegistry extends ComponentRegistry = CoreComponentRegistry> = (world: World<TRegistry>, entityA: Entity, entityB: Entity, manifold: CollisionManifold) => void;
export type TriggerCallback<TRegistry extends ComponentRegistry = CoreComponentRegistry> = (world: World<TRegistry>, entityA: Entity, entityB: Entity) => void;

/**
 * Basic 2D Collision System.
 */
export class CollisionSystem2D<TRegistry extends ComponentRegistry = CoreComponentRegistry> extends System<TRegistry> {
  private onCollisionCallbacks: CollisionCallback<TRegistry>[] = [];
  private onTriggerEnterCallbacks: TriggerCallback<TRegistry>[] = [];
  private onTriggerExitCallbacks: TriggerCallback<TRegistry>[] = [];
  private activePairs = new Set<string>();

  public onCollision(callback: CollisionCallback<TRegistry>): void { this.onCollisionCallbacks.push(callback); }
  public onTriggerEnter(callback: TriggerCallback<TRegistry>): void { this.onTriggerEnterCallbacks.push(callback); }
  public onTriggerExit(callback: TriggerCallback<TRegistry>): void { this.onTriggerExitCallbacks.push(callback); }

  public update(world: World<TRegistry>, deltaTime: number): void {
    const query = world.query("Transform" as ComponentType<TRegistry>, "Collider" as ComponentType<TRegistry>);
    const currentFramePairs = new Set<string>();

    // Clear previous frame events
    const eventQuery = world.query("CollisionEvents" as ComponentType<TRegistry>);
    for (const entity of eventQuery) {
      world.mutateComponent(entity, "CollisionEvents" as ComponentType<TRegistry>, (component) => {
        const events = component as unknown as CollisionEventsComponent;
        events.collisions.length = 0;
        events.triggersEntered.length = 0;
        events.triggersExited.length = 0;
      });
    }

    const candidates = BroadPhase.sweepAndPrune([...query], world as unknown as World<CoreComponentRegistry>);

    for (const [entityA, entityB] of candidates) {
      const colA = world.getComponent(entityA, "Collider" as ComponentType<TRegistry>) as unknown as ColliderComponent;
      const colB = world.getComponent(entityB, "Collider" as ComponentType<TRegistry>) as unknown as ColliderComponent;

      if (!colA || !colB || !colA.enabled || !colB.enabled) continue;
      if (!this.shouldCollide(colA, colB)) continue;

      const transA = world.getComponent(entityA, "Transform" as ComponentType<TRegistry>) as unknown as TransformComponent;
      const transB = world.getComponent(entityB, "Transform" as ComponentType<TRegistry>) as unknown as TransformComponent;

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

  private notifyCollisionEvent(world: World<TRegistry>, a: Entity, b: Entity, manifold: CollisionManifold): void {
    this.addCollisionToComponent(world, a, b, manifold, false);
    this.addCollisionToComponent(world, b, a, manifold, true);
  }

  private addCollisionToComponent(world: World<TRegistry>, entity: Entity, other: Entity, manifold: CollisionManifold, flipNormal: boolean): void {
    const events = world.getComponent(entity, "CollisionEvents" as ComponentType<TRegistry>);
    if (!events) return;

    world.mutateComponent(entity, "CollisionEvents" as ComponentType<TRegistry>, (component) => {
      const eComp = component as unknown as CollisionEventsComponent;
      eComp.collisions.push({
        otherEntity: other,
        normalX: flipNormal ? -manifold.normalX : manifold.normalX,
        normalY: flipNormal ? -manifold.normalY : manifold.normalY,
        depth: manifold.depth,
        contactPoints: manifold.contactPoints
      });
    });
  }

  private notifyTriggerEvent(world: World<TRegistry>, a: Entity, b: Entity, phase: "enter" | "exit"): void {
    this.addTriggerToComponent(world, a, b, phase);
    this.addTriggerToComponent(world, b, a, phase);
  }

  private addTriggerToComponent(world: World<TRegistry>, entity: Entity, other: Entity, phase: "enter" | "exit"): void {
    const events = world.getComponent(entity, "CollisionEvents" as ComponentType<TRegistry>);
    if (!events) return;

    world.mutateComponent(entity, "CollisionEvents" as ComponentType<TRegistry>, (component) => {
      const eComp = component as unknown as CollisionEventsComponent;
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
export class CCDSystem<TRegistry extends ComponentRegistry = CoreComponentRegistry> extends System<TRegistry> {
  public update(world: World<TRegistry>, deltaTime: number): void {
    // CCD logic for fast-moving objects
  }
}
