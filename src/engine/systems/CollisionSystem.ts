import { System } from "../core/System";
import { World } from "../core/World";
import { TransformComponent, ColliderComponent, Entity, ReclaimableComponent, AABB } from "../types/EngineTypes";
import { SpatialHash } from "../collision/SpatialHash";

/**
 * Sistema de colisiones genérico para TinyAsterEngine.
 * Gestiona la detección de colisiones círculo-círculo optimizada mediante Spatial Hashing.
 *
 * @responsibility Detectar pares de entidades en colisión y disparar el callback {@link onCollision}.
 * @responsibility Mantener la eficiencia O(N) en la fase ancha (broadphase) usando {@link SpatialHash}.
 * @queries Transform, Collider
 * @mutates Entidades (vía onCollision)
 * @executionOrder Fase: Collision. Debe ejecutarse después de MovementSystem.
 * @remarks
 * El sistema utiliza un hash espacial para evitar comprobaciones O(N²).
 * Soporta capas y máscaras de colisión para filtrado selectivo.
 */
export abstract class CollisionSystem extends System {
  private spatialHash = new SpatialHash(100);
  private queryResult = new Set<Entity>();
  private aabb: AABB = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  private processedPairs = new Set<string>();

  /**
   * Updates the collision state.
   * Optimizes checks using a Spatial Hashing algorithm for broadphase.
   */
  public update(world: World, deltaTime: number): void {
    void deltaTime;
    const colliders = world.query("Transform", "Collider");
    const n = colliders.length;
    if (n < 2) return;

    // Broadphase with Spatial Hash
    this.spatialHash.clear();
    for (let i = 0; i < n; i++) {
      const id = colliders[i];
      const pos = world.getComponent<TransformComponent>(id, "Transform")!;
      const col = world.getComponent<ColliderComponent>(id, "Collider")!;

      const layer = (col as any).layer !== undefined ? (col as any).layer : 1;
      const mask = (col as any).mask !== undefined ? (col as any).mask : 1;
      if (layer === 0 && mask === 0) continue;

      const radius = col.radius || (col as any).size / 2 || 0;
      const halfWidth = (col as any).width ? (col as any).width / 2 : radius;
      const halfHeight = (col as any).height ? (col as any).height / 2 : radius;

      this.aabb.minX = pos.x - halfWidth;
      this.aabb.maxX = pos.x + halfWidth;
      this.aabb.minY = pos.y - halfHeight;
      this.aabb.maxY = pos.y + halfHeight;
      this.spatialHash.insert(id, this.aabb);
    }

    this.processedPairs.clear();

    for (let i = 0; i < n; i++) {
      const idA = colliders[i];
      const posA = world.getComponent<TransformComponent>(idA, "Transform")!;
      const colA = world.getComponent<ColliderComponent>(idA, "Collider");

      if (!colA) continue;
      const maskA = (colA as any).mask !== undefined ? (colA as any).mask : 1;
      if (maskA === 0) continue;

      const radiusA = colA.radius || (colA as any).size / 2 || 0;
      const halfWidth = (colA as any).width ? (colA as any).width / 2 : radiusA;
      const halfHeight = (colA as any).height ? (colA as any).height / 2 : radiusA;

      this.aabb.minX = posA.x - halfWidth;
      this.aabb.maxX = posA.x + halfWidth;
      this.aabb.minY = posA.y - halfHeight;
      this.aabb.maxY = posA.y + halfHeight;

      this.queryResult.clear();
      this.spatialHash.query(this.aabb, this.queryResult);

      for (const idB of this.queryResult) {
        if (idA === idB) continue;

        const colB = world.getComponent<ColliderComponent>(idB, "Collider");
        if (!colB) continue;
        const layerB = (colB as any).layer !== undefined ? (colB as any).layer : 1;
        if (!(maskA & layerB)) continue;

        // Principle 5: Composite keys without assuming ID ranges.
        // Using string-based keys for safety.
        const pairKey = idA < idB ? `${idA},${idB}` : `${idB},${idA}`;
        if (this.processedPairs.has(pairKey)) continue;
        this.processedPairs.add(pairKey);

        const posB = world.getComponent<TransformComponent>(idB, "Transform")!;
        if (this.isCollidingWithComponents(posA, colA, posB, colB)) {
          this.onCollision(world, idA, idB);
        }
      }
    }
  }

  /**
   * Internal collision check using pre-retrieved components.
   */
  private isCollidingWithComponents(posA: TransformComponent, colA: ColliderComponent, posB: TransformComponent, colB: ColliderComponent): boolean {
    const dx = posA.x - posB.x;
    const dy = posA.y - posB.y;
    const distanceSq = dx * dx + dy * dy;
    const radiusA = colA.radius || (colA as any).size / 2 || 0;
    const radiusB = colB.radius || (colB as any).size / 2 || 0;
    const radiusSum = radiusA + radiusB;
    return distanceSq < radiusSum * radiusSum;
  }

  /**
   * Circle-to-circle collision check.
   */
  protected isColliding(world: World, entityA: Entity, entityB: Entity): boolean {
    const posA = world.getComponent<TransformComponent>(entityA, "Transform");
    const posB = world.getComponent<TransformComponent>(entityB, "Transform");
    const colA = world.getComponent<ColliderComponent>(entityA, "Collider");
    const colB = world.getComponent<ColliderComponent>(entityB, "Collider");

    if (!posA || !posB || !colA || !colB) return false;

    const dx = posA.x - posB.x;
    const dy = posA.y - posB.y;
    const distanceSq = dx * dx + dy * dy;
    const radiusA = colA.radius || (colA as any).size / 2 || 0;
    const radiusB = colB.radius || (colB as any).size / 2 || 0;
    const radiusSum = radiusA + radiusB;

    return distanceSq < radiusSum * radiusSum;
  }

  /**
   * Gancho abstracto invocado cuando se detecta una colisión entre dos entidades.
   * Las subclases de juego deben implementar este método para definir la lógica de respuesta.
   *
   * @param world - El mundo ECS donde ocurre la colisión.
   * @param entityA - La primera entidad del par en colisión.
   * @param entityB - La segunda entidad del par en colisión.
   *
   * @sideEffect Puede eliminar entidades, aplicar daño o generar efectos visuales.
   */
  protected abstract onCollision(world: World, entityA: Entity, entityB: Entity): void;

  /**
   * Identifies if a pair of entities matches two specified component types.
   * Returns an object mapping the types to their respective entities if they match,
   * otherwise returns undefined.
   */
  protected matchPair<T1 extends string, T2 extends string>(
    world: World,
    entityA: Entity,
    entityB: Entity,
    type1: T1,
    type2: T2
  ): Record<T1 | T2, Entity> | undefined {
    if (world.hasComponent(entityA, type1) && world.hasComponent(entityB, type2)) {
      return { [type1]: entityA, [type2]: entityB } as Record<T1 | T2, Entity>;
    }
    if (world.hasComponent(entityB, type1) && world.hasComponent(entityA, type2)) {
      return { [type1]: entityB, [type2]: entityA } as Record<T1 | T2, Entity>;
    }
    return undefined;
  }

  /**
   * Destroys an entity, notifying its pool if it possesses a ReclaimableComponent.
   */
  protected destroyEntity(world: World, entity: Entity): void {
    const reclaimable = world.getComponent<ReclaimableComponent>(entity, "Reclaimable");
    if (reclaimable) {
      reclaimable.onReclaim(world, entity);
    }
    world.removeEntity(entity);
  }
}
