/**
 * Generic collision layer utilities.
 * Games should define their own specific bitmasks using layer().
 */

export type CollisionLayer = number;
export type CollisionMask = number;

/**
 * Creates a bitmask for a single layer.
 * @param bit - Bit index (0-31).
 */
export function layer(bit: number): number {
  return 1 << bit;
}

/**
 * Combines multiple layers into a single mask.
 */
export function maskOf(...layers: number[]): number {
  return layers.reduce((acc, value) => acc | value, 0);
}

/**
 * Checks if two entities should collide based on their layers and masks.
 */
export function shouldCollide(layerA: number, maskA: number, layerB: number, maskB: number): boolean {
  return (layerA & maskB) !== 0 && (layerB & maskA) !== 0;
}

export const ALL_LAYERS = 0xFFFFFFFF;
