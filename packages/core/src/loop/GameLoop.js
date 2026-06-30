"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameLoop = void 0;
const FrameScheduler_1 = require("./FrameScheduler");
/**
 * A platform-agnostic game loop implementation using a fixed-timestep accumulator.
 *
 * @remarks
 * This loop is designed to support a consistent internal simulation frequency
 * (fixed timestep target) independent of the rendering framerate.
 *
 * @warning
 * **Spiral of Death Mitigation**: Under heavy load, if the simulation (update) takes longer
 * than the available frame time, the loop will clamp `deltaTime` to `maxDelta`.
 * In such cases, the simulation will not catch up with real-time, resulting in a "slow-motion"
 * effect relative to the wall clock. This is intended to prevent unrecoverable lag accumulation
 * (spiral of death), but it means the simulation tick count will fall behind real-time.
 */
class GameLoop {
    renderSubscribers = new Set();
    updateSubscribers = new Set();
    lastTime = 0;
    accumulator = 0;
    step;
    maxDelta;
    scheduler;
    manual;
    isRunning = false;
    frameHandle;
    constructor(config = {}) {
        this.step = config.step ?? 1 / 60;
        this.maxDelta = config.maxDelta ?? 0.25;
        this.scheduler = config.scheduler ?? FrameScheduler_1.browserFrameScheduler;
        this.manual = config.manual ?? false;
    }
    /**
     * Starts the game loop.
     */
    start() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        this.lastTime = this.scheduler.now();
        if (!this.manual) {
            this.frameHandle = this.scheduler.requestFrame(this.loop);
        }
    }
    /**
     * Stops the game loop.
     */
    stop() {
        this.isRunning = false;
        if (this.frameHandle !== undefined) {
            this.scheduler.cancelFrame(this.frameHandle);
            this.frameHandle = undefined;
        }
    }
    /**
     * Stops the internal automatic loop and switches to manual mode.
     */
    stopInternalLoop() {
        this.manual = true;
        if (this.frameHandle !== undefined) {
            this.scheduler.cancelFrame(this.frameHandle);
            this.frameHandle = undefined;
        }
    }
    /**
     * Executes a single tick of the game loop.
     * @param currentTime - The current time in milliseconds. If not provided, the scheduler's time is used.
     */
    tick(currentTime) {
        if (!this.isRunning)
            return;
        // Use scheduler time if not provided
        const now = currentTime ?? this.scheduler.now();
        let deltaTime = (now - this.lastTime) / 1000;
        this.lastTime = now;
        // Prevent spiral of death
        if (deltaTime > this.maxDelta) {
            deltaTime = this.maxDelta;
        }
        this.accumulator += deltaTime;
        while (this.accumulator >= this.step) {
            this.updateSubscribers.forEach(sub => sub(this.step));
            this.accumulator -= this.step;
        }
        const alpha = this.accumulator / this.step;
        this.renderSubscribers.forEach(sub => sub(alpha));
    }
    loop = (currentTime) => {
        this.tick(currentTime);
        if (this.isRunning && !this.manual) {
            this.frameHandle = this.scheduler.requestFrame(this.loop);
        }
    };
    /**
     * Subscribes a callback to be called every fixed update step.
     * @param callback - The callback receiving the fixed delta time.
     * @returns A function to unsubscribe.
     */
    subscribeUpdate(callback) {
        this.updateSubscribers.add(callback);
        return () => this.updateSubscribers.delete(callback);
    }
    /**
     * Subscribes a callback to be called every frame for rendering.
     * @param callback - The callback receiving the interpolation alpha.
     * @returns A function to unsubscribe.
     */
    subscribeRender(callback) {
        this.renderSubscribers.add(callback);
        return () => this.renderSubscribers.delete(callback);
    }
}
exports.GameLoop = GameLoop;
