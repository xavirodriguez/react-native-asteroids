import { World } from "../../ecs/World";
import { System } from "../../ecs/System";
import { ComponentRegistry } from "../../ecs/Component";
import { Entity } from "../../ecs/Entity";
import { CollisionManifold } from "./CollisionTypes";
import { BroadPhase } from "./BroadPhase";
import { NarrowPhase } from "./NarrowPhase";
import { CoreComponentRegistry } from "../../ecs/CoreComponents";
import { ShapeType } from "../shapes/Shapes";

export type CollisionCallback<TRegistry extends ComponentRegistry = CoreComponentRegistry> = (world: World<TRegistry>, entityA: Entity, entityB: Entity, manifold: CollisionManifold) => void;
export type TriggerCallback<TRegistry extends ComponentRegistry = CoreComponentRegistry> = (world: World<TRegistry>, entityA: Entity, entityB: Entity) => void;

export class CollisionSystem2D<TRegistry extends CoreComponentRegistry = CoreComponentRegistry> extends System<TRegistry> {
  private onCollisionCallbacks: CollisionCallback<TRegistry>[] = [];
  private onTriggerEnterCallbacks: TriggerCallback<TRegistry>[] = [];
  private onTriggerExitCallbacks: TriggerCallback<TRegistry>[] = [];
  private activePairs = new Set<string>();
  private candidateEntities: Entity[] | null = null;

  public onCollision(callback: CollisionCallback<TRegistry>): void { this.onCollisionCallbacks.push(callback); }
  public onTriggerEnter(callback: TriggerCallback<TRegistry>): void { this.onTriggerEnterCallbacks.push(callback); }
  public onTriggerExit(callback: TriggerCallback<TRegistry>): void { this.onTriggerExitCallbacks.push(callback); }

  public setCandidates(entities: Entity[] | null): void {
    this.candidateEntities = entities;
  }

  public update(world: World<TRegistry>, _deltaTime: number): void {
    // Cast to access core components reliably while maintaining generic TRegistry if needed by subclasses
    const w = world as unknown as World<CoreComponentRegistry>;
    const resourceCandidates = world.getResource<Entity[]>("SpatialCullingCandidates");
    const candidatesList = this.candidateEntities !== null ? this.candidateEntities : (resourceCandidates !== undefined ? resourceCandidates : null);

    let query: Entity[];
    if (candidatesList !== null) {
      query = [];
      for (const entity of candidatesList) {
        if (w.hasComponent(entity, "Transform") && w.hasComponent(entity, "Collider")) {
          query.push(entity);
        }
      }
    } else {
      query = [...w.query("Transform", "Collider")];
    }
    const currentFramePairs = new Set<string>();

    const eventQuery = w.query("CollisionEvents");
    for (const entity of eventQuery) {
      w.mutateComponent(entity, "CollisionEvents", (component) => {
        component.collisions.length = 0;
        component.triggersEntered.length = 0;
        component.triggersExited.length = 0;
      });
    }

    const candidates = BroadPhase.sweepAndPrune([...query], w);

    for (const [entityA, entityB] of candidates) {
      const colA = w.getComponent(entityA, "Collider")!;
      const colB = w.getComponent(entityB, "Collider")!;

      if (!colA.enabled || !colB.enabled) continue;
      if (!this.shouldCollide(colA.layer, colB.mask, colB.layer, colA.mask)) continue;

      const transA = w.getComponent(entityA, "Transform")!;
      const transB = w.getComponent(entityB, "Transform")!;

      const manifold = NarrowPhase.test(
        colA.shape,
        (transA.worldX ?? transA.x) + (colA.offsetX ?? 0),
        (transA.worldY ?? transA.y) + (colA.offsetY ?? 0),
        transA.worldRotation ?? transA.rotation,
        colB.shape,
        (transB.worldX ?? transB.x) + (colB.offsetX ?? 0),
        (transB.worldY ?? transB.y) + (colB.offsetY ?? 0),
        transB.worldRotation ?? transB.rotation
      );

      if (manifold.colliding) {
        const pairId = this.getPairId(entityA, entityB);
        currentFramePairs.add(pairId);

        if (colA.isTrigger || colB.isTrigger) {
          if (!this.activePairs.has(pairId)) {
            this.onTriggerEnterCallbacks.forEach(cb => cb(world, entityA, entityB));
            this.notifyTriggerEvent(w, entityA, entityB, "enter");
          }
        } else {
          this.onCollisionCallbacks.forEach(cb => cb(world, entityA, entityB, manifold));
          this.notifyCollisionEvent(w, entityA, entityB, manifold);
        }
      }
    }

    this.activePairs.forEach(pairId => {
      if (!currentFramePairs.has(pairId)) {
        const [idA, idB] = pairId.split(",").map(Number);
        this.onTriggerExitCallbacks.forEach(cb => cb(world, idA, idB));
        this.notifyTriggerEvent(w, idA, idB, "exit");
      }
    });

    this.activePairs = currentFramePairs;
  }

  private shouldCollide(layerA: number, maskB: number, layerB: number, maskA: number): boolean {
    return (layerA & maskB) !== 0 && (layerB & maskA) !== 0;
  }

  private getPairId(a: Entity, b: Entity): string {
    return a < b ? `${a},${b}` : `${b},${a}`;
  }

  private notifyCollisionEvent(world: World<CoreComponentRegistry>, a: Entity, b: Entity, manifold: CollisionManifold): void {
    this.addCollisionToComponent(world, a, b, manifold, false);
    this.addCollisionToComponent(world, b, a, manifold, true);
  }

  private addCollisionToComponent(world: World<CoreComponentRegistry>, entity: Entity, other: Entity, manifold: CollisionManifold, flipNormal: boolean): void {
    world.mutateComponent(entity, "CollisionEvents", (eComp) => {
      eComp.collisions.push({
        otherEntity: other,
        normalX: flipNormal ? -manifold.normalX : manifold.normalX,
        normalY: flipNormal ? -manifold.normalY : manifold.normalY,
        depth: manifold.depth,
        contactPoints: manifold.contactPoints
      });
    });
  }

  private notifyTriggerEvent(world: World<CoreComponentRegistry>, a: Entity, b: Entity, phase: "enter" | "exit"): void {
    this.addTriggerToComponent(world, a, b, phase);
    this.addTriggerToComponent(world, b, a, phase);
  }

  private addTriggerToComponent(world: World<CoreComponentRegistry>, entity: Entity, other: Entity, phase: "enter" | "exit"): void {
    world.mutateComponent(entity, "CollisionEvents", (eComp) => {
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

export class CCDSystem<TRegistry extends CoreComponentRegistry = CoreComponentRegistry> extends System<TRegistry> {
  private candidateEntities: Entity[] | null = null;

  public setCandidates(entities: Entity[] | null): void {
    this.candidateEntities = entities;
  }

  public update(world: World<TRegistry>, deltaTime: number): void {
    const w = world as unknown as World<CoreComponentRegistry>;
    const resourceCandidates = world.getResource<Entity[]>("SpatialCullingCandidates");
    const candidatesList = this.candidateEntities !== null ? this.candidateEntities : (resourceCandidates !== undefined ? resourceCandidates : null);

    let query: Entity[];
    let collidables: Entity[];
    if (candidatesList !== null) {
      query = [];
      collidables = [];
      for (const entity of candidatesList) {
        const hasTransform = w.hasComponent(entity, "Transform");
        const hasCollider = w.hasComponent(entity, "Collider");
        if (hasTransform && hasCollider) {
          collidables.push(entity);
          if (w.hasComponent(entity, "Velocity")) {
            query.push(entity);
          }
        }
      }
    } else {
      query = [...w.query("Transform", "Velocity", "Collider")];
      collidables = [...w.query("Transform", "Collider")];
    }

    for (const entity of query) {
      const trans = w.getComponent(entity, "Transform")!;
      const vel = w.getComponent(entity, "Velocity")!;
      const col = w.getComponent(entity, "Collider")!;

      if (!col.enabled || (vel.vx === 0 && vel.vy === 0)) continue;

      const p0x = (trans.worldX ?? trans.x);
      const p0y = (trans.worldY ?? trans.y);
      const p1x = p0x + vel.vx * deltaTime;
      const p1y = p0y + vel.vy * deltaTime;

      for (const other of collidables) {
        if (entity === other) continue;
        const otherCol = w.getComponent(other, "Collider")!;
        if (!otherCol.enabled || otherCol.isTrigger) continue;
        if (!this.shouldCollide(col.layer, otherCol.mask, otherCol.layer, col.mask)) continue;

        const otherTrans = w.getComponent(other, "Transform")!;
        const ox = (otherTrans.worldX ?? otherTrans.x);
        const oy = (otherTrans.worldY ?? otherTrans.y);

        if (otherCol.shape.type === ShapeType.Circle) {
          const radius = otherCol.shape.radius;
          if (this.rayIntersectsCircle(p0x, p0y, p1x, p1y, ox + (otherCol.offsetX ?? 0), oy + (otherCol.offsetY ?? 0), radius)) {
             this.notifyCollision(w, entity, other);
          }
        } else if (otherCol.shape.type === ShapeType.Box) {
          const { width, height } = otherCol.shape;
          if (this.rayIntersectsBox(p0x, p0y, p1x, p1y, ox + (otherCol.offsetX ?? 0), oy + (otherCol.offsetY ?? 0), width, height)) {
            this.notifyCollision(w, entity, other);
          }
        }
      }
    }
  }

  private shouldCollide(layerA: number, maskB: number, layerB: number, maskA: number): boolean {
    return (layerA & maskB) !== 0 && (layerB & maskA) !== 0;
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

  private notifyCollision(world: World<CoreComponentRegistry>, entityA: Entity, entityB: Entity): void {
     world.mutateComponent(entityA, "CollisionEvents", (comp) => {
        comp.collisions.push({ otherEntity: entityB, normalX: 0, normalY: 0, depth: 0, contactPoints: [] });
     });
  }
}
