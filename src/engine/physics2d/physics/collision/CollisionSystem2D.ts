import { System } from "../../core/System";
import { World } from "../../core/World";
import { Entity, TransformComponent, Collider2DComponent, CollisionEventsComponent, CollisionManifold, ContinuousColliderComponent, VelocityComponent } from "../../types/EngineTypes";
import { BroadPhase } from "./BroadPhase";
import { NarrowPhase } from "./NarrowPhase";
import { ContinuousCollision, CCDResult } from "./ContinuousCollision";
import { SpatialHash } from "./SpatialHash";

export type CollisionCallback = (world: World, entityA: Entity, entityB: Entity, manifold: CollisionManifold) => void;
export type TriggerCallback = (world: World, entityA: Entity, entityB: Entity) => void;

/**
 * Sistema integral de detección de colisiones 2D.
 *
 * @responsibility Selección de fase ancha híbrida (Spatial Hash / Sweep and Prune).
 * @responsibility Detección de fase estrecha (AABB, Círculo) y generación de manifolds.
 * @responsibility Implementar Continuous Collision Detection (CCD) para objetos rápidos.
 *
 * @queries Transform, Collider2D, CollisionEvents, ContinuousCollider, Velocity
 * @mutates {@link CollisionEventsComponent} - Limpia y repuebla los buffers de eventos por frame.
 * @mutates {@link TransformComponent} - Puede ajustar posiciones cuando CCD detecta impactos.
 * @emits Datos de manifold de colisión y eventos de ciclo de vida de Trigger (Enter, Stay, Exit).
 * @executionOrder Fase: {@link SystemPhase.Collision}.
 *
 * @remarks
 * Este sistema es el corazón de la interacción física. Utiliza un Spatial Hash para optimizar
 * mundos con más de 50 entidades. Los eventos de colisión se almacenan en componentes
 * para ser consumidos por sistemas de GameRules (ej: DamageSystem).
 *
 * @conceptualRisk [MUTATION_SAFETY][HIGH] Los callbacks de colisión se ejecutan durante la
 * iteración. Modificar el World (añadir/quitar entidades) en estos callbacks es peligroso.
 * @conceptualRisk [SPATIAL_HASH_TUNING][MEDIUM] El tamaño de celda del hash debe estar
 * equilibrado con el tamaño promedio de los objetos para evitar saturación de celdas.
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
    for (let i = 0; i < eventEntities.length; i++) {
      const entity = eventEntities[i];
      const events = world.getComponent<CollisionEventsComponent>(entity, "CollisionEvents")!;
      events.collisions.length = 0; events.triggersEntered.length = 0; events.triggersExited.length = 0;
    }

    let candidates: Array<[Entity, Entity]>;
    if (this.spatialHash) {
      this.spatialHash.clear();
      const entityBoundsMap = new Map<Entity, import("../../types/EngineTypes").AABB>();
      for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        const bounds = BroadPhase.getShapeBounds(world.getComponent<TransformComponent>(entity, "Transform")!, world.getComponent<Collider2DComponent>(entity, "Collider2D")!);
        entityBoundsMap.set(entity, bounds);
        this.spatialHash!.insert(entity, bounds);
      }
      candidates = [];
      for (let i = 0; i < entities.length; i++) {
        const entityA = entities[i];
        const boundsA = entityBoundsMap.get(entityA);
        if (!boundsA) continue;

        const potentials = new Set<Entity>();
        this.spatialHash!.query(boundsA, potentials);
        potentials.forEach(entityB => {
          if (entityA < entityB) {
            candidates.push([entityA, entityB]);
          }
        });
      }
    } else {
      candidates = BroadPhase.sweepAndPrune([...entities], world);
    }

    for (const [entityA, entityB] of candidates) {
      const colA = world.getComponent<Collider2DComponent>(entityA, "Collider2D")!;
      const colB = world.getComponent<Collider2DComponent>(entityB, "Collider2D")!;
      if (!colA.enabled || !colB.enabled) continue;
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
                      transA.x += velA.dx * dtSeconds * ccdResult.timeOfImpact;
                      transA.y += velA.dy * dtSeconds * ccdResult.timeOfImpact;
                  }
                  if (velB) {
                      transB.x += velB.dx * dtSeconds * ccdResult.timeOfImpact;
                      transB.y += velB.dy * dtSeconds * ccdResult.timeOfImpact;
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
