/**
 * Utility for cloning of ECS components and snapshots.
 */
export class ComponentCloner {
  /**
   * Attempts to perform a deep clone of a component data object or any POJO.
   */
  public static cloneComponent<T>(data: T): T {
    if (data === null || typeof data !== "object") {
      return data;
    }

    if (typeof structuredClone === "function") {
      try {
        return structuredClone(data) as T;
      } catch {
        return this.manualDeepClone(data);
      }
    }

    return this.manualDeepClone(data);
  }

  /**
   * Fallback recursive clone for environments without structuredClone.
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

    const obj = data as Record<string, unknown>;
    const copy = {} as Record<string, unknown>;

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        copy[key] = this.manualDeepClone(obj[key]);
      }
    }
    return copy as unknown as T;
  }
}
