/**
 * Base interface for all components.
 *
 * @remarks
 * Every component must have a unique 'type' property that matches its
 * key in the {@link ComponentRegistry}.
 */
export interface Component {
  type: string;
}

/**
 * Registry of all components available in a specific World instance.
 */
export type ComponentRegistry = Record<string, Component>;

export type ComponentType<TRegistry extends ComponentRegistry> =
  Extract<keyof TRegistry, string>;

export type ComponentOf<
  TRegistry extends ComponentRegistry,
  TType extends ComponentType<TRegistry>
> = TRegistry[TType];

/**
 * Recursively makes all properties of a type readonly.
 *
 * @remarks
 * This is used to encourage immutability when accessing components through
 * non-mutating world methods. Note that this is a compile-time check and
 * does not prevent runtime mutations if the type is cast back to mutable.
 */
export type DeepReadonly<T> =
  T extends (...args: any[]) => any
    ? T
    : T extends readonly any[]
      ? ReadonlyArray<DeepReadonly<T[number]>>
      : T extends object
        ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
        : T;
