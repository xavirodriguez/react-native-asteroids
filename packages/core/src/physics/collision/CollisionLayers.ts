/**
 * Predefined collision layers (bitmasks).
 * Games can extend these or define their own.
 */
export const CollisionLayers = {
  DEFAULT:    0b00000001,  // 1
  PLAYER:     0b00000010,  // 2
  ENEMY:      0b00000100,  // 4
  PROJECTILE: 0b00001000,  // 8
  PLATFORM:   0b00010000,  // 16
  TRIGGER:    0b00100000,  // 32
  PICKUP:     0b01000000,  // 64
  DEBRIS:     0b10000000,  // 128
} as const;

export const ALL_LAYERS = 0xFFFFFFFF;

/**
 * Helper to combine multiple layers into a single bitmask.
 */
export function layerMask(...layers: number[]): number {
  return layers.reduce((acc, l) => acc | l, 0);
}

/**
 * Checks if two entities should collide based on their layers and masks.
 */
export function shouldCollide(layerA: number, maskA: number, layerB: number, maskB: number): boolean {
  return (layerA & maskB) !== 0 && (layerB & maskA) !== 0;
}
