/**
 * Represents a serializable snapshot of the world state.
 *
 * @remarks
 * Snapshots include entity lists, component data, and RNG state. They are
 * intended for persistence, networking, and rollback mechanisms.
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
