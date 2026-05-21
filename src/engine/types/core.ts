import { Entity } from "../core/Entity";
import { World } from "../core/World";
import { Component } from "../core/Component";

/**
 * Represents a serialized component, intended to contain only flat, serializable data.
 */
export type SerializedComponent = Record<string, unknown>;

/**
 * Represents a map of component types to their respective entity-component data.
 */
export type ComponentDataSnapshot = Record<string, Record<Entity, SerializedComponent>>;

/**
 * Represents a snapshot of the ECS world state intended for serialization and state restoration.
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
  seed: number;
  /** Current simulation tick. */
  tick: number;
}

/**
 * Interface for entity pools.
 */
export interface IEntityPool {
  release(world: World, entity: Entity): void;
}
