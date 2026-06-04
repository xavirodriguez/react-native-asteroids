import { Entity } from "../ecs/Entity";

/**
 * Represents a serialized component, intended to contain only flat, serializable data.
 */
export type SerializedComponent = Record<string, unknown>;

/**
 * Represents a map of component types to their respective entity-component data.
 */
export type ComponentDataSnapshot = Record<string, Record<Entity, SerializedComponent>>;

/**
 * Represents a snapshot of the ECS world state intended to support serialization and state restoration.
 */
export interface WorldSnapshot {
  entities: Entity[];
  componentData: ComponentDataSnapshot;
  nextEntityId: number;
  freeEntities: Entity[];
  /** Incremented on structural changes (add/remove entity or component type). */
  structureVersion: number;
  /** Incremented on data changes or visual updates. */
  stateVersion: number;
  /**
   * Internal state of the PRNG. Intended to support bit-perfect restoration
   * of the random number sequence.
   */
  rngState?: number;
  /** Time accumulator from GameLoop. */
  accumulator?: number;
  /** Current simulation tick. */
  tick: number;
}
