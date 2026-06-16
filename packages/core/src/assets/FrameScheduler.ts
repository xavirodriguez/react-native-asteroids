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
 * A FrameScheduler implementation that uses browser/DOM APIs.
 */
export const browserFrameScheduler: FrameScheduler = {
  now: () => (globalThis.performance?.now?.() ?? Date.now()),
  requestFrame: (callback) => globalThis.requestAnimationFrame(callback),
  cancelFrame: (handle) => globalThis.cancelAnimationFrame(handle as number),
};
