export interface Component {
  type: string;
}

export type ComponentRegistry = Record<string, Component>;

export type ComponentType<TRegistry extends ComponentRegistry> =
  Extract<keyof TRegistry, string>;

export type ComponentOf<
  TRegistry extends ComponentRegistry,
  TType extends ComponentType<TRegistry>
> = TRegistry[TType];

export type DeepReadonly<T> =
  T extends (...args: unknown[]) => unknown
    ? T
    : T extends readonly unknown[]
      ? ReadonlyArray<DeepReadonly<T[number]>>
      : T extends object
        ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
        : T;
