import { WorldSnapshot } from "../types/EngineTypes";

/**
 * Utility for cloning of ECS components and snapshots.
 * Designed to help ensure that snapshots and live world state do not share object
 * references (aliasing), which is an important factor for deterministic rollback
 * and netcode.
 *
 * @warning **Performance & Allocation**: Cloning is an expensive operation that
 * increases GC pressure. It is intended to be used judiciously, such as during
 * snapshotting for state persistence or network synchronization.
 */
export class ComponentCloner {
  /**
   * Performs a deep clone of a component data object or any POJO.
   *
   * @param data - The data to clone.
   * @returns A deep copy of the input data.
   */
  public static cloneComponent<T>(data: T): T {
    if (data === null || typeof data !== "object") {
      return data;
    }

    // Use native structuredClone if available (Node 17+, Modern Browsers, React Native 0.70+)
    if (typeof structuredClone === "function") {
      try {
        return structuredClone(data);
      } catch {
        // Fallback if data contains non-cloneable items (though ECS components should be POJOs)
        return this.manualDeepClone(data);
      }
    }

    return this.manualDeepClone(data);
  }

  /**
   * Deep clones an entire WorldSnapshot object.
   *
   * @param snapshot - The snapshot to clone.
   * @returns A completely independent WorldSnapshot instance.
   */
  public static deepCloneSnapshot(snapshot: WorldSnapshot): WorldSnapshot {
    // Entities and freeEntities are flat arrays of numbers
    const clonedSnapshot: WorldSnapshot = {
      ...snapshot,
      entities: [...snapshot.entities],
      freeEntities: [...snapshot.freeEntities],
      componentData: {}
    };

    // Deep clone the component data structure
    for (const type in snapshot.componentData) {
      clonedSnapshot.componentData[type] = {};
      const entitiesInType = snapshot.componentData[type];

      for (const entityId in entitiesInType) {
        clonedSnapshot.componentData[type][entityId] = this.cloneComponent(entitiesInType[entityId]);
      }
    }

    return clonedSnapshot;
  }

  /**
   * Fallback recursive clone for environments without structuredClone.
   * Designed for ECS POJOs (Plain Old JavaScript Objects).
   */
  private static manualDeepClone<T>(data: T): T {
    if (data === null || typeof data !== "object") {
      return data;
    }

    if (Array.isArray(data)) {
      const copy = new Array(data.length);
      for (let i = 0; i < data.length; i++) {
        copy[i] = this.manualDeepClone(data[i]);
      }
      return copy as unknown as T;
    }

    const copy = {} as Record<string, unknown>;
    const obj = data as Record<string, unknown>;

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        copy[key] = this.manualDeepClone(obj[key]);
      }
    }
    return copy as unknown as T;
  }
}
