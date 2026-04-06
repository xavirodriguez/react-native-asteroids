/**
 * Generic object pool for reusing objects and reducing GC pressure.
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

  public acquire(): T {
    const obj = this.pool.pop() || this.factory();
    // Principle 6: Object Pool - Reset before reuse
    this.reset(obj);

    // Principle 6: Object Pool - consume() SIEMPRE retorna copias, nunca referencias
    // Note: Shallow copy is sufficient for current BoundData and simple engine structures.
    const copy = { ...obj };

    // In DEV, freeze the returned object to detect mutations
    if (process.env.NODE_ENV === "development") {
      Object.freeze(copy);
    }

    return copy as T;
  }

  public release(obj: T): void {
    // We still reset on release to clear references immediately (GC)
    this.reset(obj);
    this.pool.push(obj);
  }

  public get size(): number {
    return this.pool.length;
  }
}
