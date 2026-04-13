import { CameraState, SharedCamera } from "../core/types/SystemTypes";
/**
 * Hook to initialize a shared camera for the Skia renderer.
 */
export declare const useSharedCamera: (initialState?: Partial<CameraState>) => SharedCamera;
/**
 * CameraSystem: Manages camera logic like follow, lerp, shake, and bounds.
 *
 * @deprecated Use Camera2D instead for a platform-agnostic implementation.
 */
export declare class CameraSystem {
    private sharedCamera;
    private targetEntityId;
    private bounds;
    private lerpFactor;
    constructor(sharedCamera: SharedCamera);
    follow(entityId: number | null, options?: {
        lerp?: number;
    }): void;
    setBounds(bounds: {
        minX: number;
        minY: number;
        maxX: number;
        maxY: number;
    } | null): void;
    shake(intensity: number, duration?: number): void;
    update(world: any, deltaTime: number, viewportSize: {
        width: number;
        height: number;
    }): void;
    worldToScreen(point: {
        x: number;
        y: number;
    }): {
        x: number;
        y: number;
    };
    screenToWorld(point: {
        x: number;
        y: number;
    }): {
        x: number;
        y: number;
    };
}
