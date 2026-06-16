export interface FrameScheduler {
  now(): number;
  requestFrame(callback: (time: number) => void): unknown;
  cancelFrame(handle: unknown): void;
}

export const browserFrameScheduler: FrameScheduler = {
  now: () => (typeof globalThis !== 'undefined' && (globalThis as any).performance?.now?.()) || Date.now(),
  requestFrame: (callback) => {
    const gt = globalThis as any;
    if (typeof gt !== 'undefined' && gt.requestAnimationFrame) {
      return gt.requestAnimationFrame(callback);
    }
    return setTimeout(() => callback(Date.now()), 16);
  },
  cancelFrame: (handle) => {
    const gt = globalThis as any;
    if (typeof gt !== 'undefined' && gt.cancelAnimationFrame) {
      gt.cancelAnimationFrame(handle as number);
    } else {
      clearTimeout(handle as any);
    }
  }
};
