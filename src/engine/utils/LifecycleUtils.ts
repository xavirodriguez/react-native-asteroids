/**
 * Helper to run a lifecycle method that may be synchronous or asynchronous.
 * If the function is synchronous, it executes it and returns immediately.
 * If it returns a Promise, it awaits it.
 * This avoids unnecessary event loop yields for synchronous lifecycle methods.
 *
 * @param fn - The lifecycle function to execute.
 */
export async function runLifecycle(fn: () => void | Promise<void>): Promise<void> {
  const result = fn();
  if (result instanceof Promise) {
    await result;
  }
}
