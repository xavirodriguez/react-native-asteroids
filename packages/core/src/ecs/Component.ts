import { Entity } from "./Entity";

/**
 * Base interface for all components.
 * Components are intended to be plain data objects.
 */
export interface Component {
  /**
   * Unique identifier for the component type.
   */
  type: string;
}

/**
 * A component with dynamic properties.
 */
export interface GenericComponent extends Component {
  [key: string]: any;
}

export type ComponentRegistry = Record<string, Component>;

export type ComponentType<T extends ComponentRegistry> = keyof T & string;

export type ComponentOf<T extends ComponentRegistry, K extends ComponentType<T>> = T[K];

/**
 * Recursively makes all properties of a type readonly.
 * Used to help enforce immutability when retrieving components from the World.
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends (infer U)[]
    ? ReadonlyArray<DeepReadonly<U>>
    : T[P] extends object
    ? DeepReadonly<T[P]>
    : T[P];
};
