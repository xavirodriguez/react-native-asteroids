/**
 * Represents a serializable snapshot of the world state.
 *
 * @remarks
 * Snapshots include entity lists, component data, and RNG state. They are
 * intended for persistence, networking, and rollback mechanisms.
 *
 * @warning
 * **Serializable state only**: Snapshots only capture serializable state (primitive
 * values, plain objects/arrays). The following are NOT captured and will be lost or
 * corrupted during snapshot/restore:
 * - Functions and closures.
 * - Class instances (unless they are plain objects under the hood).
 * - Circular references.
 * - External/native resources (e.g. GPU buffers, DOM elements, AudioContext handles).
 * - Map and Set instances (must be converted to Objects/Arrays if needed).
 *
 * These must be managed, re-initialized, or manually synchronized after restoration.
 */
export interface WorldSnapshot {
  entities: number[];
  componentData: ComponentDataSnapshot;
  nextEntityId: number;
  freeEntities: number[];
  structureVersion: number;
  stateVersion: number;
  seed: number;
  rngState?: number;
  tick: number;
}

/**
 * Flat storage of component data organized by type and entity ID.
 */
export type ComponentDataSnapshot = Record<string, Record<number, SerializedComponent>>;

/**
 * A serialized representation of a component, containing only its serializable properties.
 */
export type SerializedComponent = Record<string, any>;
