import { Entity } from "./Entity";

export interface Component {
  type: string;
}

export interface GenericComponent extends Component {
  [key: string]: any;
}

export type ComponentRegistry = Record<string, Component>;

export type ComponentType<T extends ComponentRegistry> = keyof T & string;

export type ComponentOf<T extends ComponentRegistry, K extends ComponentType<T>> = T[K];

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends (infer U)[]
    ? ReadonlyArray<DeepReadonly<U>>
    : T[P] extends object
    ? DeepReadonly<T[P]>
    : T[P];
};
