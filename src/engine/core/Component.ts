import { ComponentType } from "../../types/GameTypes";

/**
 * Base interface for all components.
 * Every component must have a type discriminator.
 */
export interface Component {
  /** Discriminator for the component type */
  readonly type: ComponentType;
}
