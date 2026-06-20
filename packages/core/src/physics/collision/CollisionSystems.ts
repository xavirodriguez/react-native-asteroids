import { World, ComponentType } from "../../ecs/World";
import { System } from "../../ecs/System";
import { ComponentRegistry } from "../../ecs/Component";
import { Entity } from "../../ecs/Entity";
import { CollisionManifold, Collision } from "./CollisionTypes";
import { BroadPhase } from "./BroadPhase";
import { NarrowPhase } from "./NarrowPhase";
import { ColliderComponent, TransformComponent, VelocityComponent, CollisionEventsComponent, CoreComponentRegistry } from "../../ecs/CoreComponents";
import { ShapeType } from "../shapes/Shapes";

export type CollisionCallback<TRegistry extends ComponentRegistry = CoreComponentRegistry> = (world: World<TRegistry>, entityA: Entity, entityB: Entity, manifold: CollisionManifold) => void;
export type TriggerCallback<TRegistry extends ComponentRegistry = CoreComponentRegistry> = (world: World<TRegistry>, entityA: Entity, entityB: Entity) => void;

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

export class CCDSystem<TRegistry extends ComponentRegistry = CoreComponentRegistry> extends System<TRegistry> {
  public update(world: World<TRegistry>, deltaTime: number): void {
    const query = world.query(
      "Transform" as ComponentType<TRegistry>,
      "Velocity" as ComponentType<TRegistry>,
      "Collider" as ComponentType<TRegistry>
    );
    const collidables = world.query(
      "Transform" as ComponentType<TRegistry>,
      "Collider" as ComponentType<TRegistry>
    );

    for (const entity of query) {
      const trans = world.getComponent(entity, "Transform" as ComponentType<TRegistry>) as unknown as TransformComponent;
      const vel = world.getComponent(entity, "Velocity" as ComponentType<TRegistry>) as unknown as VelocityComponent;
      const col = world.getComponent(entity, "Collider" as ComponentType<TRegistry>) as unknown as ColliderComponent;

      if (!col.enabled || (vel.vx === 0 && vel.vy === 0)) continue;

      const p0x = (trans.worldX ?? trans.x);
      const p0y = (trans.worldY ?? trans.y);
      const p1x = p0x + vel.vx * (deltaTime / 1000);
      const p1y = p0y + vel.vy * (deltaTime / 1000);

      for (const other of collidables) {
        if (entity === other) continue;
        const otherCol = world.getComponent(other, "Collider" as ComponentType<TRegistry>) as unknown as ColliderComponent;
        if (!otherCol.enabled || otherCol.isTrigger) continue;
        if (!this.shouldCollide(col, otherCol)) continue;

        const otherTrans = world.getComponent(other, "Transform" as ComponentType<TRegistry>) as unknown as TransformComponent;
        const ox = (otherTrans.worldX ?? otherTrans.x);
        const oy = (otherTrans.worldY ?? otherTrans.y);

        if (otherCol.shape.type === ShapeType.Circle) {
          const circle = otherCol.shape as any;
          if (this.rayIntersectsCircle(p0x, p0y, p1x, p1y, ox, oy, circle.radius)) {
             this.notifyCollision(world, entity, other);
          }
        } else if (otherCol.shape.type === ShapeType.Box) {
          const box = otherCol.shape as any;
          if (this.rayIntersectsBox(p0x, p0y, p1x, p1y, ox, oy, box.width, box.height)) {
            this.notifyCollision(world, entity, other);
          }
        }
      }
    }
  }

  private shouldCollide(a: ColliderComponent, b: ColliderComponent): boolean {
    return (a.layer & b.mask) !== 0 && (b.layer & a.mask) !== 0;
  }

  private rayIntersectsCircle(p0x: number, p0y: number, p1x: number, p1y: number, cx: number, cy: number, radius: number): boolean {
    const dx = p1x - p0x;
    const dy = p1y - p0y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return false;
    const t = ((cx - p0x) * dx + (cy - p0y) * dy) / lenSq;
    const clampedT = Math.max(0, Math.min(1, t));
    const closestX = p0x + clampedT * dx;
    const closestY = p0y + clampedT * dy;
    const distSq = (closestX - cx) ** 2 + (closestY - cy) ** 2;
    return distSq <= radius * radius;
  }

  private rayIntersectsBox(p0x: number, p0y: number, p1x: number, p1y: number, bx: number, by: number, width: number, height: number): boolean {
    const halfW = width / 2;
    const halfH = height / 2;
    const minX = bx - halfW;
    const maxX = bx + halfW;
    const minY = by - halfH;
    const maxY = by + halfH;

    let tmin = -Infinity;
    let tmax = Infinity;

    if (p1x !== p0x) {
      const tx1 = (minX - p0x) / (p1x - p0x);
      const tx2 = (maxX - p0x) / (p1x - p0x);
      tmin = Math.max(tmin, Math.min(tx1, tx2));
      tmax = Math.min(tmax, Math.max(tx1, tx2));
    } else if (p0x < minX || p0x > maxX) return false;

    if (p1y !== p0y) {
      const ty1 = (minY - p0y) / (p1y - p0y);
      const ty2 = (maxY - p0y) / (p1y - p0y);
      tmin = Math.max(tmin, Math.min(ty1, ty2));
      tmax = Math.min(tmax, Math.max(ty1, ty2));
    } else if (p0y < minY || p0y > maxY) return false;

    return tmax >= tmin && tmax >= 0 && tmin <= 1;
  }

  private notifyCollision(world: World<TRegistry>, entityA: Entity, entityB: Entity): void {
     world.mutateComponent(entityA, "CollisionEvents" as ComponentType<TRegistry>, (comp: any) => {
        comp.collisions.push({ otherEntity: entityB, normalX: 0, normalY: 0, depth: 0, contactPoints: [] });
     });
  }
}
