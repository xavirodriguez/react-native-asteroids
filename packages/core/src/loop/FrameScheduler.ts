/**
 * Abstract interface for frame scheduling.
 * Allows decoupling the GameLoop from DOM-dependent APIs like requestAnimationFrame.
 */
export interface FrameScheduler {
  /** Returns the current time in milliseconds. */
  now(): number;
  /** Schedules a callback for the next frame. */
  requestFrame(callback: (time: number) => void): unknown;
  /** Cancels a previously scheduled frame. */
  cancelFrame(handle: unknown): void;
}

/**
 * Default implementation using global browser/React Native APIs.
 */
export const defaultFrameScheduler: FrameScheduler = {
  now: () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now()),
  requestFrame: (callback) => globalThis.requestAnimationFrame(callback),
  cancelFrame: (handle) => globalThis.cancelAnimationFrame(handle as number),
};
