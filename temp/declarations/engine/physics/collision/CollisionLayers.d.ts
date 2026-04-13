/**
 * Predefined collision layers (bitmasks).
 * Games can extend these or define their own.
 */
export declare const CollisionLayers: {
    readonly DEFAULT: 1;
    readonly PLAYER: 2;
    readonly ENEMY: 4;
    readonly PROJECTILE: 8;
    readonly PLATFORM: 16;
    readonly TRIGGER: 32;
    readonly PICKUP: 64;
    readonly DEBRIS: 128;
};
export declare const ALL_LAYERS = 4294967295;
/**
 * Helper to combine multiple layers into a single bitmask.
 */
export declare function layerMask(...layers: number[]): number;
/**
 * Checks if two entities should collide based on their layers and masks.
 */
export declare function shouldCollide(layerA: number, maskA: number, layerB: number, maskB: number): boolean;
