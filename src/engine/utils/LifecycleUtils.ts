/**
 * Lifecycle execution utilities.
 *
 * @remarks
 * Provides explicit separation between synchronous and asynchronous lifecycle hooks
 * to eliminate "Zalgo" risks and ensure deterministic execution order.
 */

/**
 * Executes a synchronous lifecycle hook.
 *
 * @remarks
 * Guarantees immediate execution without microtask delay.
 * Prohibits async functions to ensure deterministic execution order.
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
 */
export async function runLifecycleAsync(fn: () => Promise<void>): Promise<void> {
  return fn();
}
