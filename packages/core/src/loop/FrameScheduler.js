"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.browserFrameScheduler = void 0;
/**
 * A FrameScheduler implementation that uses browser/DOM APIs when available,
 * falling back to setTimeout and Date.now for Node.js or headless environments.
 */
exports.browserFrameScheduler = {
    now: () => {
        const gt = globalThis;
        const perf = gt.performance;
        if (perf && perf.now) {
            return perf.now();
        }
        return Date.now();
    },
    requestFrame: (callback) => {
        const gt = globalThis;
        const raf = gt.requestAnimationFrame;
        if (raf) {
            return raf(callback);
        }
        return setTimeout(() => callback(Date.now()), 16);
    },
    cancelFrame: (handle) => {
        const gt = globalThis;
        const caf = gt.cancelAnimationFrame;
        if (caf) {
            caf(handle);
        }
        else {
            clearTimeout(handle);
        }
    },
};
