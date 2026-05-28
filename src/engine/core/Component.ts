/**
 * Base interface for all components.
 * Every component is expected to have a unique type discriminator.
 *
 * @remarks
 * Components are designed to be POJOs (Plain Old JavaScript Objects) that hold data.
 * This structure is intended to help facilitate serialization, snapshots, and state replication.
 * Systems process entities by filtering for these data structures.
 */
export interface Component {
  /**
   * Discriminator for the component type.
   * Must be unique across the engine and games.
   */
  type: string;
}

/**
 * A generic version of a component that allows access to arbitrary data.
 * Useful for components whose exact structure is defined dynamically or outside the core.
 *
 * @remarks
 * This generic version is intended to improve type safety by allowing the specification of the
 * expected data structure. It is recommended for use with interfaces describing simple
 * POJOs to help maintain compatibility with the snapshot system.
 *
 * @conceptualRisk [TYPE_SAFETY] Using overly generic types may weaken compile-time validations.
 *
 * @typeParam T - Data structure extending a record of serializable values.
 *
 * @warning **Serialization**: To help ensure snapshots and network replication work as intended,
 * it is recommended to keep component data structures simple and avoid circular references.
 */
export type GenericComponent<T extends Record<string, unknown> = Record<string, unknown>> = Component & T;
