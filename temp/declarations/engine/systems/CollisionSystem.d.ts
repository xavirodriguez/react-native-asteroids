import { System } from "../core/System";
import { World } from "../core/World";
import { Entity } from "../types/EngineTypes";
/**
 * Sistema de colisiones genérico para TinyAsterEngine.
 * Gestiona la detección de colisiones círculo-círculo optimizada mediante Spatial Hashing.
 *
 * @responsibility Detectar pares de entidades en colisión y disparar el callback {@link onCollision}.
 * @responsibility Mantener la eficiencia O(N) en la fase ancha (broadphase) usando {@link SpatialHash}.
 * @queries Transform, Collider
 * @mutates Entidades (vía onCollision)
 * @executionOrder Fase: Collision. Debe ejecutarse después de MovementSystem.
 *
 * @contract Broadphase: Todas las entidades con Collider son insertadas en el {@link SpatialHash} cada tick.
 * @contract Narrowphase: Se realizan comprobaciones de distancia euclidiana solo para entidades en celdas adyacentes.
 * @invariant El sistema no modifica la posición de las entidades; la respuesta física es responsabilidad de {@link onCollision}.
 *
 * @conceptualRisk [PERFORMANCE][MEDIUM] Re-inserción masiva en el hash espacial cada frame genera presión en el GC.
 * @conceptualRisk [TYPE_SAFETY][MEDIUM] Uso frecuente de `as any` para acceder a propiedades extendidas de `ColliderComponent`
 * (layer, mask, size, width) rompe el contrato de tipos estáticos.
 */
export declare abstract class CollisionSystem extends System {
    private spatialHash;
    private queryResult;
    private aabb;
    private processedPairs;
    /**
     * Ejecuta el ciclo de detección de colisiones utilizando Spatial Hashing.
     *
     * @param world - El mundo ECS.
     * @param deltaTime - Tiempo transcurrido (ignorado para la detección).
     *
     * @precondition Las entidades deben poseer `Transform` y `Collider`.
     * @postcondition El {@link SpatialHash} interno se actualiza con las posiciones actuales.
     * @sideEffect Invoca el método protegido {@link onCollision} de forma inmediata al detectar
     * un par válido.
     * @conceptualRisk [MUTATION][HIGH] Si `onCollision` elimina entidades del mundo, el iterador
     * actual en `update` podría procesar referencias inválidas o saltarse entidades.
     */
    update(world: World, deltaTime: number): void;
    /**
     * Internal collision check using pre-retrieved components.
     */
    private isCollidingWithComponents;
    /**
     * Circle-to-circle collision check.
     */
    protected isColliding(world: World, entityA: Entity, entityB: Entity): boolean;
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
    protected matchPair<T1 extends string, T2 extends string>(world: World, entityA: Entity, entityB: Entity, type1: T1, type2: T2): Record<T1 | T2, Entity> | undefined;
    /**
     * Destroys an entity, notifying its pool if it possesses a ReclaimableComponent.
     */
    protected destroyEntity(world: World, entity: Entity): void;
}
