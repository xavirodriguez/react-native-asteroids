/**
 * @packageDocumentation
 * Object Pooling for Memory Optimization.
 * Reduces garbage collection pressure by reusing object instances.
 */

/**
 * Generic object pool for reusing objects and reducing GC pressure.
 *
 * @remarks
 * Follows 'Principle 6' of the engine architecture:
 * - `reset` is called BEFORE reuse in `acquire()`.
 * - `reset` is called before release to ensure a clean state is maintained in the pool.
 * - In development, objects can be frozen to detect accidental mutations after release.
 *
 * @responsibility Manage a collection of pre-allocated objects.
 * @responsibility Abstract the creation and recycling of instances.
 *
 * @template T - The type of object being pooled.
 *
 * @example
 * ```ts
 * const bulletPool = new ObjectPool(
 *   () => new Bullet(),
 *   (b) => b.reset()
 * );
 * const b = bulletPool.acquire();
 * // ... use bullet ...
 * bulletPool.release(b);
 * ```
 */
export class ObjectPool<T> {
  /** Internal storage for idle objects. */
  private pool: T[] = [];
  /** Factory function to create new instances when the pool is empty. */
  private factory: () => T;
  /** Function to clear an object's state before reuse or storage. */
  private reset: (obj: T) => void;

  /**
   * Creates a new ObjectPool.
   *
   * @param factory - Callback to instantiate a new object of type T.
   * @param reset - Callback to clear the state of an object.
   * @param initialSize - Optional number of objects to pre-allocate.
   */
  constructor(factory: () => T, reset: (obj: T) => void, initialSize: number = 0) {
    this.factory = factory;
    this.reset = reset;

    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.factory());
    }
  }

  /**
   * Acquires an object from the pool or creates a new one if the pool is empty.
   * Resets the object before returning it to ensure a clean state.
   *
   * @returns A fresh or recycled object of type T.
   * @remarks
   * The object is returned as a mutable reference to allow the caller
   * to populate its properties before use.
   *
   * @mutates pool (pops an item)
   */
  public acquire(): T {
    const obj = this.pool.pop() || this.factory();
    this.reset(obj);
    return obj;
  }

  /**
   * Principle 6: Returns shallow copies of all items in the pool.
   * In development, these copies are frozen to prevent accidental mutations.
   *
   * @returns An array of current pool items.
   * @queries pool
   */
  public consume(): T[] {
    const items = this.pool.map(obj => ({ ...obj }) as T);

    if (__DEV__) {
      return items.map(obj => Object.freeze(obj));
    }

    return items;
  }

  /**
   * Releases an object back to the pool for future reuse.
   *
   * @param obj - The object to recycle.
   *
   * @remarks
   * Resets the object before storing it to avoid holding stale references.
   *
   * @mutates pool (pushes an item)
   */
  public release(obj: T): void {
    this.reset(obj);
    this.pool.push(obj);
  }

  /**
   * Current number of idle objects available in the pool.
   * @queries pool.length
   */
  public get size(): number {
    return this.pool.length;
  }
}

/** Global helper for development mode detection. */
const __DEV__ = process.env.NODE_ENV !== "production";
