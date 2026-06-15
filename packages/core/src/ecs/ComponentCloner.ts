/**
 * Utility for deep cloning component data.
 *
 * @remarks
 * This cloner performs a recursive shallow-copy of objects and arrays.
 * It is primarily intended for serializable data and does not handle:
 * - Circular references (will cause stack overflow)
 * - Class instances (preserves properties but loses prototype/methods)
 * - Special types like Map, Set, Date, etc.
 * - Functions (skipped during snapshotting, but this cloner itself doesn't filter them)
 *
 * Used during world snapshotting and restoration.
 */
export class ComponentCloner {
  /**
   * Performs a deep clone of the provided value.
   *
   * @param component - The value to clone.
   * @returns A deep clone of the value.
   */
  public static cloneComponent<T>(component: T): T {
    if (component === null || typeof component !== "object") {
      return component;
    }

    if (Array.isArray(component)) {
      return component.map(v => this.cloneComponent(v)) as unknown as T;
    }

    const clone = {} as any;
    for (const key in component) {
      if (Object.prototype.hasOwnProperty.call(component, key)) {
        clone[key] = this.cloneComponent((component as any)[key]);
      }
    }
    return clone;
  }
}
