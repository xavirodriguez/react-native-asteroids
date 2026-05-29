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
  type: string;
}

/**
 * Registry of all components available in the system.
 */
export type ComponentRegistry = Record<string, Component>;

export type BlueprintRegistryMap<TComponents extends ComponentRegistry> =
  Record<string, import("./BlueprintRegistry").BlueprintDefinition<TComponents, any>>;

/**
 * Extracts the keys of a component registry.
 */
export type ComponentType<TRegistry extends ComponentRegistry> =
  Extract<keyof TRegistry, string>;

/**
 * Infers the component type from the registry and type discriminator.
 */
export type ComponentOf<
  TRegistry extends ComponentRegistry,
  TType extends ComponentType<TRegistry>
> = TRegistry[TType];

/**
 * Deeply makes all properties of a type readonly.
 */
export type DeepReadonly<T> =
  T extends (...args: any[]) => any
    ? T
    : T extends readonly any[]
      ? ReadonlyArray<DeepReadonly<T[number]>>
      : T extends object
        ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
        : T;

/**
 * A generic version of a component that allows access to arbitrary data.
 * Useful for components whose exact structure is defined dynamically or outside the core.
 *
 * @remarks
 * This generic version is designed to support type safety by allowing the specification of the
 * expected data structure. It is recommended for use with interfaces describing simple
 * POJOs to help maintain compatibility with the snapshot system.
 *
 * @conceptualRisk [TYPE_SAFETY] Using overly generic types may weaken compile-time validations.
 *
 * @typeParam T - Data structure extending a record of serializable values.
 *
 * @warning **Serialization**: To help support snapshots and network replication,
 * it is recommended to keep component data structures simple and avoid circular references.
 */
export type GenericComponent<T extends Record<string, unknown> = Record<string, unknown>> = Component & T;
