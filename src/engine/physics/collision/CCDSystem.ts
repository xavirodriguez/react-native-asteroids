import { System } from "../../core/System";
import { World } from "../../core/World";
import {
  Entity, TransformComponent, Collider2DComponent,
  ContinuousColliderComponent, VelocityComponent, CollisionEventsComponent,
  CollisionManifold, CollisionEvent
} from "../../types/EngineTypes";
import { PhysicsQuery } from "../query/PhysicsQuery";
import { ContinuousCollision } from "./ContinuousCollision";

/**
 * Continuous Collision Detection (CCD) System.
 *
 * @responsibility Detect and resolve collisions for fast-moving entities before discrete phase.
 * @responsibility Mitigate "tunneling" by using raycasting or swept volumes.
 */
export class CCDSystem extends System {
  private static readonly entitiesCache: Entity[] = [];

  /**
   * Ejecuta el chequeo de CCD para todas las entidades habilitadas.
   */
  update(world: World, deltaTime: number): void {
    const dtSeconds = deltaTime / 1000;
    if (dtSeconds <= 0) return;

    const query = world.query("Transform", "Collider2D", "ContinuousCollider", "Velocity");
    CCDSystem.entitiesCache.length = 0;
    for (let i = 0; i < query.length; i++) {
        CCDSystem.entitiesCache.push(query[i]);
    }

    // Orden determinista para evitar desincronizaciones en multiplayer
    CCDSystem.entitiesCache.sort((a, b) => a - b);

    const entities = CCDSystem.entitiesCache;

    // Limpiar CollisionEvents antes de empezar el CCD para que CollisionSystem2D no los borre después.
    // CollisionSystem2D DEBE correr después de CCD y detectar que ya hay eventos.
    const eventQuery = world.query("CollisionEvents");
    for (let i = 0; i < eventQuery.length; i++) {
        world.mutateComponent<CollisionEventsComponent>(eventQuery[i], "CollisionEvents", events => {
            // Preservamos activeTriggers pero limpiamos el resto
            events.collisions.length = 0;
            events.triggersEntered.length = 0;
            events.triggersExited.length = 0;
        });
    }

    // Usamos un conjunto para ignorar al propio proyectil en el raycast
    const ignored = new Set<Entity>();

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const ccd = world.getComponent<ContinuousColliderComponent>(entity, "ContinuousCollider")!;
      if (!ccd.enabled) continue;

      const vel = world.getComponent<VelocityComponent>(entity, "Velocity")!;
      const col = world.getComponent<Collider2DComponent>(entity, "Collider2D")!;
      const speedSq = vel.dx * vel.dx + vel.dy * vel.dy;

      // Threshold check: si es muy lento, dejamos que el CollisionSystem2D normal lo maneje
      let threshold = ccd.velocityThreshold;
      if (threshold === undefined) {
        // Heurística: si se mueve más de la mitad de su tamaño en un frame
        if (col.shape.type === "circle") threshold = col.shape.radius * 30; // ~0.5 radius at 60fps
        else if (col.shape.type === "aabb") threshold = Math.min(col.shape.halfWidth, col.shape.halfHeight) * 30;
        else threshold = 500;
      }

      if (speedSq < threshold * threshold) continue;

      const trans = world.getComponent<TransformComponent>(entity, "Transform")!;

      const startX = trans.worldX ?? trans.x;
      const startY = trans.worldY ?? trans.y;

      const mode = ccd.mode ?? "raycast";

      if (mode === "raycast") {
        this.resolveRaycastCCD(world, entity, startX, startY, vel.dx, vel.dy, col, ccd, dtSeconds, ignored);
      } else if (mode === "swept") {
        this.resolveSweptCCD(world, entity, startX, startY, vel.dx, vel.dy, col, ccd, dtSeconds);
      } else if (mode === "substep") {
        this.resolveSubstepCCD(world, entity, trans, vel, col, ccd, dtSeconds);
      }
    }
  }

  private resolveSweptCCD(
    world: World, entity: Entity,
    startX: number, startY: number,
    dx: number, dy: number,
    col: Readonly<Collider2DComponent>,
    ccd: Readonly<ContinuousColliderComponent>,
    dt: number
  ): void {
    const entities = world.query("Transform", "Collider2D");
    let closestTOI = 1;
    let bestHit: { other: Entity, normalX: number, normalY: number, contactX: number, contactY: number } | null = null;

    for (const other of entities) {
      if (other === entity) continue;
      const otherCol = world.getComponent<Collider2DComponent>(other, "Collider2D")!;
      if (!otherCol.enabled || (col.mask & otherCol.layer) === 0) continue;

      const otherTrans = world.getComponent<TransformComponent>(other, "Transform")!;
      const otherX = (otherTrans.worldX ?? otherTrans.x) + otherCol.offsetX;
      const otherY = (otherTrans.worldY ?? otherTrans.y) + otherCol.offsetY;

      let result = null;
      const ax = startX + col.offsetX;
      const ay = startY + col.offsetY;

      if (col.shape.type === "circle") {
        if (otherCol.shape.type === "circle") {
          result = ContinuousCollision.sweptCircleVsCircle(ax, ay, dx, dy, col.shape.radius + (ccd.radiusPadding ?? 0), otherX, otherY, otherCol.shape.radius, dt);
        } else if (otherCol.shape.type === "aabb") {
          result = ContinuousCollision.sweptCircleVsAABB(ax, ay, dx, dy, col.shape.radius + (ccd.radiusPadding ?? 0), otherX, otherY, otherCol.shape.halfWidth, otherCol.shape.halfHeight, dt);
        }
      } else if (col.shape.type === "aabb") {
        if (otherCol.shape.type === "aabb") {
          result = ContinuousCollision.sweptAABBVsAABB(ax, ay, dx, dy, col.shape.halfWidth + (ccd.radiusPadding ?? 0), col.shape.halfHeight + (ccd.radiusPadding ?? 0), otherX, otherY, otherCol.shape.halfWidth, otherCol.shape.halfHeight, dt);
        } else if (otherCol.shape.type === "circle") {
          result = ContinuousCollision.sweptAABBVsCircle(ax, ay, dx, dy, col.shape.halfWidth + (ccd.radiusPadding ?? 0), col.shape.halfHeight + (ccd.radiusPadding ?? 0), otherX, otherY, otherCol.shape.radius, dt);
        }
      }

      if (result && result.hit && result.timeOfImpact < closestTOI) {
        closestTOI = result.timeOfImpact;
        bestHit = {
            other,
            normalX: result.normalX,
            normalY: result.normalY,
            contactX: result.contactX,
            contactY: result.contactY
        };
      }
    }

    if (bestHit) {
      const margin = 0.01;
      const safeTOI = Math.max(0, closestTOI - margin);

      world.mutateComponent<TransformComponent>(entity, "Transform", t => {
        t.x += dx * dt * safeTOI;
        t.y += dy * dt * safeTOI;
      });

      this.notifyCollision(world, entity, bestHit.other, {
        colliding: true,
        normalX: bestHit.normalX,
        normalY: bestHit.normalY,
        depth: 0,
        contactPoints: bestHit.contactX !== 0 || bestHit.contactY !== 0 ? [{ x: bestHit.contactX, y: bestHit.contactY }] : []
      });
    }
  }

  private resolveSubstepCCD(
    world: World, entity: Entity,
    trans: Readonly<TransformComponent>,
    vel: Readonly<VelocityComponent>,
    col: Readonly<Collider2DComponent>,
    ccd: Readonly<ContinuousColliderComponent>,
    dt: number
  ): void {
    const maxSteps = ccd.maxSubSteps ?? 4;
    const subDt = dt / maxSteps;

    for (let i = 0; i < maxSteps; i++) {
        world.mutateComponent<TransformComponent>(entity, "Transform", t => {
            t.x += vel.dx * subDt;
            t.y += vel.dy * subDt;
        });

        const curX = (trans.worldX ?? trans.x) + col.offsetX;
        const curY = (trans.worldY ?? trans.y) + col.offsetY;

        let hits: Entity[] = [];
        if (col.shape.type === "circle") {
            hits = PhysicsQuery.overlapCircle(world, curX, curY, col.shape.radius, col.mask);
        } else if (col.shape.type === "aabb") {
            hits = PhysicsQuery.overlapAABB(world, curX, curY, col.shape.halfWidth, col.shape.halfHeight, col.mask);
        } else {
            // Fallback para formas complejas
            hits = PhysicsQuery.pointQuery(world, curX, curY, col.mask);
        }

        const hit = hits.find(h => h !== entity);
        if (hit) {
            this.notifyCollision(world, entity, hit, {
                colliding: true,
                normalX: 0, normalY: 0,
                depth: 0, contactPoints: [{ x: curX, y: curY }]
            });
            break;
        }
    }
  }

  private resolveRaycastCCD(
    world: World, entity: Entity,
    startX: number, startY: number,
    dx: number, dy: number,
    col: Readonly<Collider2DComponent>,
    ccd: Readonly<ContinuousColliderComponent>,
    dt: number,
    ignored: Set<Entity>
  ): void {
    const speed = Math.sqrt(dx * dx + dy * dy);
    const dist = speed * dt;
    if (dist <= 0) return;

    ignored.clear();
    ignored.add(entity);

    const dirX = dx / speed;
    const dirY = dy / speed;

    let hit = null;

    // Si es un círculo, usamos shapeCast para un "fat ray" más preciso
    if (col.shape.type === "circle") {
      const effectiveRadius = col.shape.radius + (ccd.radiusPadding ?? 0);
      hit = PhysicsQuery.shapeCast(world, { type: "circle", radius: effectiveRadius },
        startX + col.offsetX, startY + col.offsetY,
        dirX, dirY, dist, col.mask, ignored);
    } else {
      hit = PhysicsQuery.raycast(world, {
        originX: startX + col.offsetX,
        originY: startY + col.offsetY,
        directionX: dirX,
        directionY: dirY,
        maxDistance: dist
      }, col.mask, ignored);
    }

    if (hit) {
      const margin = 0.1;
      world.mutateComponent<TransformComponent>(entity, "Transform", t => {
        t.x = hit!.pointX - col.offsetX - dirX * margin;
        t.y = hit!.pointY - col.offsetY - dirY * margin;
      });

      this.notifyCollision(world, entity, hit.entity, {
        colliding: true,
        normalX: hit.normalX,
        normalY: hit.normalY,
        depth: 0,
        contactPoints: [{ x: hit.pointX, y: hit.pointY }]
      });
    }
  }

  private notifyCollision(world: World, a: Entity, b: Entity, manifold: CollisionManifold): void {
    this.addCollisionToComponent(world, a, b, manifold, false);
    this.addCollisionToComponent(world, b, a, manifold, true);
  }

  private addCollisionToComponent(world: World, entity: Entity, other: Entity, manifold: CollisionManifold, flipNormal: boolean): void {
    const collision: CollisionEvent = {
        otherEntity: other,
        normalX: flipNormal ? -manifold.normalX : manifold.normalX,
        normalY: flipNormal ? -manifold.normalY : manifold.normalY,
        depth: manifold.depth,
        contactPoints: manifold.contactPoints
    };

    const events = world.getComponent<CollisionEventsComponent>(entity, "CollisionEvents");
    if (!events) {
      // Inmediatamente añadimos el componente con la colisión inicial para NO perder el evento
      world.getCommandBuffer().addComponent(entity, {
        type: "CollisionEvents",
        collisions: [collision],
        activeTriggers: [], triggersEntered: [], triggersExited: []
      } as CollisionEventsComponent);
    } else {
      world.mutateComponent<CollisionEventsComponent>(entity, "CollisionEvents", eComp => {
        eComp.collisions.push(collision);
      });
    }
  }
}
