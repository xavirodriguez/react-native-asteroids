/**
 * Base types and interfaces for the Entity-Component-System (ECS) architecture.
 */

/**
 * Unique identifier for an entity in the world.
 */
export type Entity = number

/**
 * Base interface for all components.
 * Every component must have a type discriminator.
 */
export interface Component {
  /** Discriminator for the component type */
  type: string
}
