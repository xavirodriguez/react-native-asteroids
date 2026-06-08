/**
 * Generic object pool implementation.
 *
 * @remarks
 * Designed to help minimize garbage collector pressure in high-frequency paths by
 * reusing objects. Effectiveness depends on the implementation of the factory and
 * reset functions, and the nature of the objects being pooled.
 */
export class ObjectPool<T> {
  private pool: T[] = [];
  private readonly factory: () => T;
  private readonly reset?: (obj: T) => void;

  constructor(factory: () => T, reset?: (obj: T) => void, initialSize = 0) {
    this.factory = factory;
    this.reset = reset;
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.factory());
    }
  }

  public acquire(): T {
    const obj = this.pool.pop() || this.factory();
    return obj;
  }

  public release(obj: T): void {
    if (this.reset) {
      this.reset(obj);
    }
    this.pool.push(obj);
  }

  public clear(): void {
    this.pool = [];
  }

  public get size(): number {
    return this.pool.length;
  }
}
