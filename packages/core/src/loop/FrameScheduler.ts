export interface FrameScheduler {
  now(): number;
  requestFrame(callback: (time: number) => void): unknown;
  cancelFrame(handle: unknown): void;
}

export const browserFrameScheduler: FrameScheduler = {
  now: () => (globalThis.performance?.now?.() ?? Date.now()),
  requestFrame: (callback) => globalThis.requestAnimationFrame(callback),
  cancelFrame: (handle) => globalThis.cancelAnimationFrame(handle as number),
};
