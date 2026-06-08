/**
 * Unique identifier for an entity in the world.
 *
 * @remarks
 * In this ECS implementation, an Entity is a lightweight numeric ID.
 * It carries no data or behavior of its own; it serves as a key to look up components.
 *
 * IDs are typically recycled by the {@link World} once an entity is removed to help
 * minimize ID space growth. ID recycling generally does not follow a specific
 * order and IDs might not be immediately available for reuse.
 */
export type Entity = number;
