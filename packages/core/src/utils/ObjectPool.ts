/**
 * Generic pool designed for object reuse and reducing GC pressure.
 *
 * Principle 6: ObjectPool Ownership and Reset
 * - reset is called BEFORE reuse in acquire()
 * - reset is called before release to ensure a clean state
 * - In development, objects can be frozen to detect accidental mutations
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private pooledSet: Set<T> = new Set();
  private factory: () => T;
  private reset: (obj: T) => void;

  constructor(factory: () => T, reset: (obj: T) => void, initialSize: number = 0) {
    this.factory = factory;
    this.reset = reset;

    for (let i = 0; i < initialSize; i++) {
      const obj = this.factory();
      this.pool.push(obj);
      this.pooledSet.add(obj);
    }
  }

  /**
   * Acquires an object from the pool or creates a new one.
   * Resets the object before returning it to ensure a clean state.
   *
   * Note: The object is returned as a mutable reference to allow the caller
   * to populate its properties before use.
   */
  public acquire(): T {
    const obj = this.pool.pop();
    if (obj) {
      this.pooledSet.delete(obj);
      this.reset(obj);
      return obj;
    }
    const newObj = this.factory();
    this.reset(newObj);
    return newObj;
  }

  /**
   * Principle 6: Returns frozen copies of all items in the pool in DEV,
   * to prevent accidental mutations of pooled memory.
   */
  public consume(): T[] {
    const items = this.pool.map(obj => ({ ...obj }) as T);

    if (__DEV__) {
      return items.map(obj => Object.freeze(obj));
    }

    return items;
  }

  /**
   * Releases an object back to the pool.
   * Resets the object before storing it to avoid holding references.
   */
  public release(obj: T): void {
    if (this.pooledSet.has(obj)) {
      console.warn("[ObjectPool] Double-release detected. Ignoring.");
      return;
    }
    this.reset(obj);
    this.pool.push(obj);
    this.pooledSet.add(obj);
  }

  public get size(): number {
    return this.pool.length;
  }
}

// Global helper for development mode
const __DEV__ = process.env.NODE_ENV !== "production";
