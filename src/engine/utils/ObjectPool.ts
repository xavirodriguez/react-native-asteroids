/**
 * Generic object pool for reusing objects and reducing GC pressure.
 *
 * Principle 6: ObjectPool Ownership and Reset
 * - reset is called BEFORE reuse in acquire()
 * - reset is called before release to ensure a clean state
 * - In development, objects can be frozen to detect accidental mutations
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private factory: () => T;
  private reset: (obj: T) => void;

  constructor(factory: () => T, reset: (obj: T) => void, initialSize: number = 0) {
    this.factory = factory;
    this.reset = reset;

    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.factory());
    }
  }

  /**
   * Acquires an object from the pool or creates a new one.
   * Resets the object before returning it to ensure a clean state.
   */
  public acquire(): T {
    const obj = this.pool.pop() || this.factory();
    this.reset(obj);
    return obj;
  }

  /**
   * Releases an object back to the pool.
   * Resets the object before storing it to avoid holding references.
   */
  public release(obj: T): void {
    this.reset(obj);
    this.pool.push(obj);
  }

  public get size(): number {
    return this.pool.length;
  }
}
