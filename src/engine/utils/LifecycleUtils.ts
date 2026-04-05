/**
 * Helper to run lifecycle methods that might be synchronous or asynchronous.
 * If the function returns a Promise, it is awaited.
 * If it returns void, it continues synchronously without yielding to the event loop.
 */
export async function runLifecycle(fn: () => void | Promise<void>): Promise<void> {
  const r = fn();
  if (r instanceof Promise) {
    await r;
  }
}
