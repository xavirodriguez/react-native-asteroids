/**
 * Core engine types.
 */

import { Entity } from "../ecs/Entity";

/**
 * Represents a serialized component as a plain object.
 */
export type SerializedComponent = Record<string, unknown>;

/**
 * A snapshot of component data across all entities.
 * Key is component type, value is a map of entity ID to serialized component.
 */
export type ComponentDataSnapshot = Record<string, Record<number, SerializedComponent>>;

/**
 * A full snapshot of the world state.
 */
export interface WorldSnapshot {
  entities: Entity[];
  componentData: ComponentDataSnapshot;
  nextEntityId: number;
  freeEntities: Entity[];
  structureVersion: number;
  stateVersion: number;
  seed?: number;
  rngState?: number;
  accumulator?: number;
  tick: number;
}
