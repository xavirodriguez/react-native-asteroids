/**
 * Lifecycle execution utilities.
 *
 * @responsibility Execute lifecycle methods while maintaining predictable execution timing.
 */

/**
 * Executes a synchronous lifecycle hook.
 * Guarantees immediate execution without microtask delay.
 *
 * @param fn - The synchronous function to execute.
 */
export function runLifecycleSync(fn: () => void): void {
  fn();
}

/**
 * Executes an asynchronous lifecycle hook.
 * Only use when IO or multi-frame operations are required.
 *
 * @param fn - The function that may return a Promise.
 */
export async function runLifecycleAsync(fn: () => void | Promise<void>): Promise<void> {
  const result = fn();
  if (result instanceof Promise) {
    await result;
  }
}
