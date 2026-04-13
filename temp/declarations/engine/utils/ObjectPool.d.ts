/**
 * Generic object pool for reusing objects and reducing GC pressure.
 *
 * Principle 6: ObjectPool Ownership and Reset
 * - reset is called BEFORE reuse in acquire()
 * - reset is called before release to ensure a clean state
 * - In development, objects can be frozen to detect accidental mutations
 */
export declare class ObjectPool<T> {
    private pool;
    private factory;
    private reset;
    constructor(factory: () => T, reset: (obj: T) => void, initialSize?: number);
    /**
     * Acquires an object from the pool or creates a new one.
     * Resets the object before returning it to ensure a clean state.
     *
     * Note: The object is returned as a mutable reference to allow the caller
     * to populate its properties before use.
     */
    acquire(): T;
    /**
     * Principle 6: Returns frozen copies of all items in the pool in DEV,
     * to prevent accidental mutations of pooled memory.
     */
    consume(): T[];
    /**
     * Releases an object back to the pool.
     * Resets the object before storing it to avoid holding references.
     */
    release(obj: T): void;
    get size(): number;
}
