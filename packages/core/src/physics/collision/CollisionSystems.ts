import { World } from "../../ecs/World";
import { System } from "../../ecs/System";
import { ComponentRegistry } from "../../ecs/Component";
import { Entity } from "../../ecs/Entity";
import { CollisionManifold } from "./CollisionTypes";
import { BroadPhase } from "./BroadPhase";
import { NarrowPhase } from "./NarrowPhase";
import { CoreComponentRegistry } from "../../ecs/CoreComponents";
import { ShapeType } from "../shapes/Shapes";
import { SpatialCullingSystem } from "../../systems/SpatialCullingSystem";

/**
 * Firma del callback invocado al ocurrir una colisión física entre dos entidades.
 * @public
 */
export type CollisionCallback<TRegistry extends ComponentRegistry = CoreComponentRegistry> = (world: World<TRegistry>, entityA: Entity, entityB: Entity, manifold: CollisionManifold) => void;

/**
 * Firma del callback invocado al entrar o salir un trigger entre dos entidades.
 * @public
 */
export type TriggerCallback<TRegistry extends ComponentRegistry = CoreComponentRegistry> = (world: World<TRegistry>, entityA: Entity, entityB: Entity) => void;

/**
 * Sistema de colisiones 2D que gestiona la detección e informe de colisiones físicas y triggers.
 *
 * @remarks
 * Este sistema utiliza un enfoque de dos fases (BroadPhase Sweep & Prune y NarrowPhase SAT/Detección precisa)
 * y soporta el filtrado de entidades mediante Spatial Culling para optimizar el rendimiento.
 *
 * @precondition Las entidades deben poseer los componentes `Transform` y `Collider` para ser procesadas.
 * @invariant Las listas de callbacks activos se mantienen consistentes durante la actualización del sistema.
 * @conceptualRisk [GC_PRESSURE] La creación constante de Sets y filtrados de arrays en cada tick puede elevar las asignaciones si no se gestionan correctamente los candidatos de culling.
 * @public
 */
export class CollisionSystem2D<TRegistry extends CoreComponentRegistry = CoreComponentRegistry> extends System<TRegistry> {
  private onCollisionCallbacks: CollisionCallback<TRegistry>[] = [];
  private onTriggerEnterCallbacks: TriggerCallback<TRegistry>[] = [];
  private onTriggerExitCallbacks: TriggerCallback<TRegistry>[] = [];
  private activePairs = new Set<string>();
  private candidateEntities: Entity[] | null = null;

  /**
   * Registra un callback que se disparará al detectarse una colisión física.
   *
   * @precondition El callback provisto debe ser una función válida.
   * @postcondition El callback se añade a la lista interna y se retorna una función de des-registro.
   * @throws Ninguno.
   * @sideEffect Muta la lista interna de callbacks de colisión.
   *
   * @param callback - La función que recibirá el evento de colisión física.
   * @returns Función para des-registrar el callback.
   */
  public onCollision(callback: CollisionCallback<TRegistry>): () => void {
    this.onCollisionCallbacks.push(callback);
    return () => {
      this.onCollisionCallbacks = this.onCollisionCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Registra un callback que se disparará cuando una entidad entre en el área de un trigger.
   *
   * @precondition El callback provisto debe ser una función válida.
   * @postcondition El callback se añade a la lista interna y se retorna una función de des-registro.
   * @throws Ninguno.
   * @sideEffect Muta la lista interna de callbacks de entrada de trigger.
   *
   * @param callback - La función que recibirá el evento de entrada al trigger.
   * @returns Función para des-registrar el callback.
   */
  public onTriggerEnter(callback: TriggerCallback<TRegistry>): () => void {
    this.onTriggerEnterCallbacks.push(callback);
    return () => {
      this.onTriggerEnterCallbacks = this.onTriggerEnterCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Registra un callback que se disparará cuando una entidad salga del área de un trigger.
   *
   * @precondition El callback provisto debe ser una función válida.
   * @postcondition El callback se añade a la lista interna y se retorna una función de des-registro.
   * @throws Ninguno.
   * @sideEffect Muta la lista interna de callbacks de salida de trigger.
   *
   * @param callback - La función que recibirá el evento de salida del trigger.
   * @returns Función para des-registrar el callback.
   */
  public onTriggerExit(callback: TriggerCallback<TRegistry>): () => void {
    this.onTriggerExitCallbacks.push(callback);
    return () => {
      this.onTriggerExitCallbacks = this.onTriggerExitCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Limpia todos los callbacks registrados y el estado de pares activos.
   *
   * @precondition Ninguna.
   * @postcondition El sistema queda en un estado limpio sin listeners ni referencias de colisión.
   * @throws Ninguno.
   * @sideEffect Vacía las listas de callbacks y limpia el set de pares de colisión activos.
   */
  public override dispose(): void {
    this.onCollisionCallbacks = [];
    this.onTriggerEnterCallbacks = [];
    this.onTriggerExitCallbacks = [];
    this.activePairs.clear();
  }

  /**
   * Establece de forma manual un subconjunto de entidades candidatas para la detección de colisiones.
   *
   * @precondition `entities` debe ser un array de IDs de entidades válidas o `null`.
   * @postcondition El sistema limitará la BroadPhase a este subconjunto si está definido.
   * @throws Ninguno.
   * @sideEffect Muta la referencia `candidateEntities`.
   *
   * @param entities - Lista de entidades candidatas o null para usar todas las del World.
   */
  public setCandidates(entities: Entity[] | null): void {
    this.candidateEntities = entities;
  }

  /**
   * Ejecuta el ciclo de actualización para la detección e informe de colisiones y triggers.
   *
   * @remarks
   * Realiza un Sweep & Prune sobre las entidades candidatas (filtradas por Spatial Culling si corresponde),
   * calcula los manifolds precisos en NarrowPhase y emite los eventos correspondientes a través de callbacks
   * y mutaciones en el componente `CollisionEvents` de las entidades involucradas.
   *
   * @precondition El World de simulación debe estar inicializado y activo.
   * @postcondition Se actualizan los componentes `CollisionEvents` de las entidades y se notifican los callbacks de colisión y trigger.
   * @invariant La consistencia de la lista de pares de colisiones activos se mantiene de forma incremental cuadro a cuadro.
   * @throws Ninguno.
   * @sideEffect Muta los componentes `CollisionEvents` de las entidades colisionadas.
   *
   * @param world - El World de la simulación.
   * @param _deltaTime - El paso de tiempo de la simulación (no utilizado directamente en la fase estática).
   * @param candidatesOverride - Lista opcional para anular las entidades candidatas por defecto.
   */
  public update(world: World<TRegistry>, _deltaTime: number, candidatesOverride?: Entity[]): void {
    // Cast to access core components reliably while maintaining generic TRegistry if needed by subclasses
    const w = world as unknown as World<CoreComponentRegistry>;
    const resourceCandidates = world.getResource<Entity[]>("SpatialCullingCandidates");
    const candidatesInput = candidatesOverride !== undefined ? candidatesOverride : this.candidateEntities;
    let candidatesList = candidatesInput !== null ? candidatesInput : (resourceCandidates !== undefined ? resourceCandidates : null);

    if (candidatesList === null && world.getResource("SpatialCullingEnabled") === true) {
      const margin = world.getResource<number>("SpatialCullingMargin") ?? 100;
      const entities = w.query("Transform", "Collider");
      candidatesList = SpatialCullingSystem.filterInViewport(world, [...entities], margin);
    }

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

    const broadPhasePairs = BroadPhase.sweepAndPrune([...query], w);

    for (const [entityA, entityB] of broadPhasePairs) {
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

  /**
   * Determina si dos capas de colisión deben interactuar según sus máscaras de colisión.
   *
   * @precondition Los valores de layer y mask deben ser enteros que representen bits flags.
   * @postcondition Retorna true si ambas entidades se seleccionan mutuamente en sus máscaras de colisión.
   */
  private shouldCollide(layerA: number, maskB: number, layerB: number, maskA: number): boolean {
    return (layerA & maskB) !== 0 && (layerB & maskA) !== 0;
  }

  /**
   * Genera un identificador único determinista para un par de entidades.
   *
   * @precondition `a` y `b` deben ser IDs numéricos válidos.
   * @postcondition Retorna una clave de string en formato 'menor,mayor'.
   */
  private getPairId(a: Entity, b: Entity): string {
    return a < b ? `${a},${b}` : `${b},${a}`;
  }

  /**
   * Notifica a los componentes `CollisionEvents` de ambas entidades la ocurrencia de una colisión física.
   *
   * @precondition Ambas entidades deben poseer el componente `CollisionEvents`.
   * @postcondition Los detalles del contacto y penetración de la colisión se añaden a ambos componentes.
   */
  private notifyCollisionEvent(world: World<CoreComponentRegistry>, a: Entity, b: Entity, manifold: CollisionManifold): void {
    this.addCollisionToComponent(world, a, b, manifold, false);
    this.addCollisionToComponent(world, b, a, manifold, true);
  }

  /**
   * Helper privado para mutar el componente `CollisionEvents` de una entidad individual.
   *
   * @precondition El componente `CollisionEvents` debe estar presente en `entity`.
   * @postcondition Añade el registro de colisión aplicando opcionalmente inversión de normal física.
   */
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

  /**
   * Notifica a los componentes `CollisionEvents` de ambas entidades la entrada o salida de un trigger.
   *
   * @precondition Ambas entidades deben poseer el componente `CollisionEvents`.
   * @postcondition Registra los triggers correspondientes en el componente de cada entidad.
   */
  private notifyTriggerEvent(world: World<CoreComponentRegistry>, a: Entity, b: Entity, phase: "enter" | "exit"): void {
    this.addTriggerToComponent(world, a, b, phase);
    this.addTriggerToComponent(world, b, a, phase);
  }

  /**
   * Helper privado para añadir o remover registros en las listas de triggers del componente `CollisionEvents`.
   *
   * @precondition La entidad provista debe poseer el componente `CollisionEvents`.
   * @postcondition Modifica las listas `triggersEntered`, `triggersExited` o `activeTriggers` del componente de forma segura.
   */
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

/**
 * Sistema CCD (Continuous Collision Detection) para detectar colisiones físicas a alta velocidad.
 *
 * @remarks
 * Resuelve el efecto "tunneling" (atravesar paredes u obstáculos entre frames) proyectando rayos (raycasting)
 * continuos entre la posición actual y la proyectada por la velocidad del objeto rápido.
 *
 * @precondition Las entidades rápidas candidatas deben poseer los componentes `Transform`, `Velocity` y `Collider`.
 * @public
 */
export class CCDSystem<TRegistry extends CoreComponentRegistry = CoreComponentRegistry> extends System<TRegistry> {
  private candidateEntities: Entity[] | null = null;

  /**
   * Establece de forma manual las entidades candidatas para la verificación CCD.
   *
   * @precondition `entities` debe ser un array de IDs de entidad o `null`.
   * @postcondition El sistema CCD limitará la búsqueda a este array si está definido.
   */
  public setCandidates(entities: Entity[] | null): void {
    this.candidateEntities = entities;
  }

  /**
   * Ejecuta la detección continua de colisiones físicas mediante barrido lineal de rayos.
   *
   * @precondition El World de la simulación debe estar inicializado y activo.
   * @postcondition Añade eventos de colisión en el componente `CollisionEvents` si se intersecta la trayectoria con un obstáculo físico.
   * @throws Ninguno.
   * @sideEffect Muta el componente `CollisionEvents` de la entidad que colisiona.
   *
   * @param world - El World de la simulación.
   * @param deltaTime - El paso de tiempo del tick actual.
   */
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

  /**
   * Evalúa la interacción entre dos capas y máscaras de colisión.
   *
   * @precondition Valores enteros que representen bits flags de capas de física.
   * @postcondition Retorna true si las máscaras y capas permiten la colisión mutua.
   */
  private shouldCollide(layerA: number, maskB: number, layerB: number, maskA: number): boolean {
    return (layerA & maskB) !== 0 && (layerB & maskA) !== 0;
  }

  /**
   * Determina matemática si un segmento de línea intercepta un círculo en el plano 2D.
   *
   * @precondition Parámetros coordenados válidos y radio mayor a cero.
   * @postcondition Retorna true si hay intersección en algún punto del trayecto proyectado.
   */
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

  /**
   * Determina matemáticamente si un segmento de línea intercepta una caja alineada con los ejes (AABB).
   *
   * @precondition Parámetros coordenados válidos y dimensiones de caja positivas.
   * @postcondition Retorna true si la trayectoria del rayo corta alguna cara de la caja en el tick actual.
   */
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

  /**
   * Agrega el registro de colisión CCD al componente `CollisionEvents` de la entidad de origen.
   *
   * @precondition La entidad de origen debe poseer el componente `CollisionEvents`.
   * @postcondition Registra un evento de colisión estático sin profundidad detallada en el manifold.
   */
  private notifyCollision(world: World<CoreComponentRegistry>, entityA: Entity, entityB: Entity): void {
     world.mutateComponent(entityA, "CollisionEvents", (comp) => {
        comp.collisions.push({ otherEntity: entityB, normalX: 0, normalY: 0, depth: 0, contactPoints: [] });
     });
  }
}
