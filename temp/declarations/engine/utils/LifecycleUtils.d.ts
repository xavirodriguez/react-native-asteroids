/**
 * Lifecycle execution utilities.
 */
/**
 * Executes a synchronous lifecycle hook.
 * Guarantees immediate execution without microtask delay.
 */
export declare function runLifecycleSync(fn: () => void): void;
/**
 * Executes an asynchronous lifecycle hook.
 */
export declare function runLifecycleAsync(fn: () => Promise<void>): Promise<void>;
