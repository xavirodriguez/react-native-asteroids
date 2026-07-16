/**
 * An Entity is represented by a unique numerical identifier.
 *
 * @remarks
 * In this ECS implementation, entities are light-weight handles. Their
 * actual data is stored in component maps within the {@link World}.
 * @public
 */
export type Entity = number;
