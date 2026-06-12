export class ObjectPool<T> {
  constructor(private factory: () => T) {}
  acquire(): T { return this.factory(); }
  release(_obj: T): void {}
}
