/**
 * Lifecycle execution utilities.
 */

/**
 * Executes a synchronous lifecycle hook.
 * Guarantees immediate execution without microtask delay.
 */
export function runLifecycleSync(fn: () => void): void {
  fn();
}

/**
 * Executes an asynchronous lifecycle hook.
 */
export async function runLifecycleAsync(fn: () => Promise<void>): Promise<void> {
  await fn();
}
