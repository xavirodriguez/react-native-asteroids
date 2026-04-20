/**
 * Base interface for all components.
 * Every component must have a type discriminator.
 *
 * @remarks
 * Components are POJOs (Plain Old JavaScript Objects) that hold data but no logic.
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
 * A generic version of a component that allows arbitrary data access.
 * Useful for accessing components whose structure is not known at compile time (e.g. GameState).
 */
export interface GenericComponent extends Component {
  [key: string]: any;
}
