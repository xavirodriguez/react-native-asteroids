/**
 * Interface for scheduling frames and retrieving high-resolution time.
 *
 * @remarks
 * Decouples the GameLoop from browser-specific APIs like requestAnimationFrame
 * and performance.now, allowing it to run in headless or custom environments.
 */
export interface FrameScheduler {
  /**
   * Returns the current time in milliseconds.
   */
  now(): number;

  /**
   * Schedules a callback to be executed before the next repaint.
   * @param callback - The function to execute.
   * @returns A handle that can be used to cancel the request.
   */
  requestFrame(callback: (time: number) => void): unknown;

  /**
   * Cancels a previously scheduled frame request.
   * @param handle - The handle returned by requestFrame.
   */
  cancelFrame(handle: unknown): void;
}

/**
 * A FrameScheduler implementation that uses browser/DOM APIs when available,
 * falling back to setTimeout and Date.now for Node.js or headless environments.
 */
export const browserFrameScheduler: FrameScheduler = {
  now: () => {
    const gt = globalThis as Record<string, unknown>;
    const perf = gt.performance as { now?: () => number } | undefined;
    if (perf && perf.now) {
      return perf.now();
    }
    return Date.now();
  },
  requestFrame: (callback) => {
    const gt = globalThis as Record<string, unknown>;
    const raf = gt.requestAnimationFrame as ((cb: (t: number) => void) => number) | undefined;
    if (raf) {
      return raf(callback);
    }
    return setTimeout(() => callback(Date.now()), 16);
  },
  cancelFrame: (handle) => {
    const gt = globalThis as Record<string, unknown>;
    const caf = gt.cancelAnimationFrame as ((h: number) => void) | undefined;
    if (caf) {
      caf(handle as number);
    } else {
      clearTimeout(handle as ReturnType<typeof setTimeout>);
    }
  },
};
