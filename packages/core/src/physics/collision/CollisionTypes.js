"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.layer = layer;
exports.maskOf = maskOf;
/**
 * Creates a collision layer from a bit position.
 * @param bit - The bit position (0-31).
 * @returns The collision layer bitmask.
 */
function layer(bit) {
    return 1 << bit;
}
/**
 * Combines multiple collision layers into a single mask.
 * @param layers - The layers to combine.
 * @returns The combined collision mask.
 */
function maskOf(...layers) {
    return layers.reduce((acc, value) => acc | value, 0);
}
