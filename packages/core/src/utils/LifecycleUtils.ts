/**
 * Lifecycle execution utilities.
 *
 * @remarks
 * Provides explicit separation between synchronous and asynchronous lifecycle hooks
 * with the goal of reducing "Zalgo" risks and supporting a more predictable execution order.
 *
 * @internal
 */

/**
 * Executes a synchronous lifecycle hook.
 *
 * @remarks
 * Designed for immediate execution without microtask delay.
 * Recommended for synchronous functions to favor a predictable execution order.
 * @public
 */
export function runLifecycleSync(fn: () => void): void {
  fn();
}

/**
 * Executes an asynchronous lifecycle hook.
 *
 * @remarks
 * Explicitly designed for hooks that require I/O or resource loading.
 * Returns a Promise that resolves once the hook is complete.
 * @public
 */
export async function runLifecycleAsync(fn: () => Promise<void>): Promise<void> {
  return fn();
}
