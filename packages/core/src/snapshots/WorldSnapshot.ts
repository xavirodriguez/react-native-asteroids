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
 * @public
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
 * @public
 */
export type ComponentDataSnapshot = Record<string, Record<number, SerializedComponent>>;

/**
 * A serialized representation of a component, containing only its serializable properties.
 * @public
 */
export type SerializedComponent = Record<string, unknown>;

/**
 * Structure of Arrays (SoA) layout for component storage inside snapshots.
 *
 * @remarks
 * Groups components of the same type together into TypedArrays to prevent object allocation
 * overhead and reduce GC pressure.
 * @public
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

/**
 * Utility to filter an SoA formatted WorldSnapshot by a Set of interest entity IDs.
 * @public
 */
export function filterSoASnapshot(snapshot: WorldSnapshot, interestIds: Set<number>): WorldSnapshot {
  if (!snapshot.isSoA || !snapshot.soaComponentData) {
    return snapshot;
  }

  const filteredEntities = snapshot.entities.filter(id => interestIds.has(id));
  const filteredSoaComponentData: Record<string, SoAComponentTypeData> = {};

  for (const type in snapshot.soaComponentData) {
    const data: SoAComponentTypeData = snapshot.soaComponentData[type];
    const keys: string[] = data.keys;
    const numKeys: number = keys.length;
    const entities = data.entities;

    let numEntities = 0;
    if (entities) {
      if (typeof (entities as any).length === "number") {
        numEntities = (entities as any).length;
      } else {
        numEntities = Object.keys(entities).filter(k => !isNaN(Number(k))).length;
      }
    }

    // Find indices of matching entities
    const matchingIndices: number[] = [];
    for (let i = 0; i < numEntities; i++) {
      const entityId = (entities as any)[i];
      if (interestIds.has(entityId)) {
        matchingIndices.push(i);
      }
    }

    if (matchingIndices.length === 0) continue;

    const newEntities = new Int32Array(matchingIndices.length);
    const newValues = new Float64Array(matchingIndices.length * numKeys);
    const newNonNumericValues = data.nonNumericValues ? new Array(matchingIndices.length * numKeys) : undefined;

    for (let i = 0; i < matchingIndices.length; i++) {
      const oldIndex = matchingIndices[i];
      newEntities[i] = (entities as any)[oldIndex];

      for (let j = 0; j < numKeys; j++) {
        const oldOffset = oldIndex * numKeys + j;
        const newOffset = i * numKeys + j;
        newValues[newOffset] = (data.values as any)[oldOffset];
        if (newNonNumericValues && data.nonNumericValues) {
          newNonNumericValues[newOffset] = data.nonNumericValues[oldOffset];
        }
      }
    }

    filteredSoaComponentData[type] = {
      keys,
      entities: newEntities,
      values: newValues,
      nonNumericValues: newNonNumericValues,
      booleanKeys: data.booleanKeys
    };
  }

  return {
    ...snapshot,
    entities: filteredEntities,
    soaComponentData: filteredSoaComponentData
  };
}
