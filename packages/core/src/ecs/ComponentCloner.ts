/**
 * Utility for deep cloning components to ensure snapshot independence.
 */
export class ComponentCloner {
  /**
   * Clones a value, handling primitives, arrays, and plain objects.
   */
  public static cloneComponent<T>(val: T): T {
    if (val === null || typeof val !== "object") {
      return val;
    }

    if (Array.isArray(val)) {
      const copy = new Array(val.length);
      for (let i = 0; i < val.length; i++) {
        copy[i] = this.cloneComponent(val[i]);
      }
      return copy as unknown as T;
    }

    if (val instanceof Set) {
      return new Set(Array.from(val).map(v => this.cloneComponent(v))) as unknown as T;
    }

    if (val instanceof Map) {
      return new Map(Array.from(val.entries()).map(([k, v]) => [k, this.cloneComponent(v)])) as unknown as T;
    }

    // Assume it's a plain object
    const copy: Record<string, unknown> = {};
    for (const key in val) {
      if (Object.prototype.hasOwnProperty.call(val, key)) {
        copy[key] = this.cloneComponent((val as Record<string, unknown>)[key]);
      }
    }
    return copy as unknown as T;
  }
}
