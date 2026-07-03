"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhysicsUtils = void 0;
/**
 * Collection of generic physics and collision utility functions.
 */
class PhysicsUtils {
    /**
     * Checks if two circles are overlapping.
     */
    static circleOverlap(x1, y1, r1, x2, y2, r2) {
        const dx = x1 - x2;
        const dy = y1 - y2;
        const distanceSq = dx * dx + dy * dy;
        const radiusSum = r1 + r2;
        return distanceSq <= radiusSum * radiusSum;
    }
    /**
     * Clamps a value between a minimum and maximum.
     */
    static clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
    /**
     * Linearly interpolates between two values.
     */
    static lerp(a, b, t) {
        return a + (b - a) * t;
    }
}
exports.PhysicsUtils = PhysicsUtils;
