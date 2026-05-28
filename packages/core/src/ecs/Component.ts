/**
 * Base interface for all components.
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
 */
export type GenericComponent<T extends Record<string, unknown> = Record<string, unknown>> = Component & T;
