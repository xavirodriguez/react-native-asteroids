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

  /**
   * Structure of Arrays (SoA) optimization flags and payload.
   */
  isSoA?: boolean;
  soaComponentData?: Record<string, SoAComponentTypeData>;
}

/**
 * Flat storage of component data organized by type and entity ID (classic AoS representation).
 */
export type ComponentDataSnapshot = Record<string, Record<number, SerializedComponent>>;

/**
 * A serialized representation of a component, containing only its serializable properties.
 */
export type SerializedComponent = Record<string, unknown>;

/**
 * Structure of Arrays (SoA) layout for component storage inside snapshots.
 *
 * @remarks
 * Groups components of the same type together into TypedArrays to prevent object allocation
 * overhead and reduce GC pressure.
 */
export interface SoAComponentTypeData {
  /**
   * Names of the serialized keys for this component type in a stable order.
   */
  keys: string[];

  /**
   * Flat array of entity IDs that possess this component type.
   */
  entities: Int32Array;

  /**
   * Flat Float64Array storing numeric and boolean properties.
   *
   * @remarks
   * Stored at index `entityIndex * keys.length + keyIndex`.
   * Boolean values are stored as 1 (true) or 0 (false).
   */
  values: Float64Array;

  /**
   * Flat array storing non-numeric properties (e.g. nested objects, arrays, strings).
   *
   * @remarks
   * Stored at index `entityIndex * keys.length + keyIndex` corresponding to values.
   */
  nonNumericValues?: any[];

  /**
   * Keys that are boolean values and should be converted back to true/false.
   */
  booleanKeys?: string[];
}
