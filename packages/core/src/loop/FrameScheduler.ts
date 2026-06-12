export interface FrameScheduler {
  now(): number;
  requestFrame(callback: (time: number) => void): unknown;
  cancelFrame(handle: unknown): void;
}

export const browserFrameScheduler: FrameScheduler = {
  now: () => (typeof globalThis !== 'undefined' && globalThis.performance?.now?.()) || Date.now(),
  requestFrame: (callback) => (typeof globalThis !== 'undefined' && globalThis.requestAnimationFrame ? globalThis.requestAnimationFrame(callback) : setTimeout(() => callback(Date.now()), 16)),
  cancelFrame: (handle) => {
    if (typeof globalThis !== 'undefined' && globalThis.cancelAnimationFrame) {
      globalThis.cancelAnimationFrame(handle as number);
    } else {
      clearTimeout(handle as any);
    }
  }
};
