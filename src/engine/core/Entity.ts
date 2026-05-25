/**
 * Unique identifier for an entity in the world.
 *
 * @remarks
 * In this ECS implementation, an Entity is a lightweight numeric ID.
 * It has no data or behavior of its own; it serves as a key to look up components.
 *
 * IDs are reused by the {@link World} once an entity is removed to minimize
 * ID space growth.
 *
 * @conceptualRisk [ID_REUSE] If an external system holds a reference to an Entity ID
 * after it has been removed, it might point to a new entity that has reused the same ID.
 */
export type Entity = number;
