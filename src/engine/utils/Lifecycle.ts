/**
 * Utility to run lifecycle methods that may return a Promise.
 * Ensures that synchronous methods continue execution without yielding to the microtask queue.
 */
export async function runLifecycle(fn: () => void | Promise<void>): Promise<void> {
  const result = fn();
  if (result instanceof Promise) {
    await result;
  }
}
