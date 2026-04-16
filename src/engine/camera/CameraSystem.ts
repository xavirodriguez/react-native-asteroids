/**
 * @packageDocumentation
 * Legacy Camera System for React Native Skia.
 * This module is maintained for compatibility, but {@link Camera2D} is preferred for new code.
 */

import { useSharedValue } from "react-native-reanimated";
import { CameraState, SharedCamera } from "../core/types/SystemTypes";
import { World } from "../core/World";
import { TransformComponent } from "../core/CoreComponents";

/**
 * Hook to initialize a shared camera for the Skia renderer.
 *
 * @param initialState - Initial values for position, zoom and shake.
 * @returns A Reanimated SharedValue containing the {@link CameraState}.
 *
 * @remarks
 * This hook should be used within a React component that manages the Skia game view.
 */
export const useSharedCamera = (initialState: Partial<CameraState> = {}): SharedCamera => {
  return useSharedValue<CameraState>({
    x: initialState.x ?? 0,
    y: initialState.y ?? 0,
    zoom: initialState.zoom ?? 1,
    shakeIntensity: initialState.shakeIntensity ?? 0,
  });
};

/**
 * CameraSystem: Manages camera logic (following, lerp, shake, and bounds).
 *
 * @deprecated This system depends on `react-native-reanimated` (SharedValue) and has non-deterministic shake.
 * Use {@link Camera2D} for a platform-agnostic and deterministic implementation.
 *
 * @remarks
 * Coordinates target following and cosmetic effects like screen shake.
 * Unlike Camera2D, this system directly mutates a SharedValue for use with Reanimated/Skia.
 *
 * @responsibility Calculate camera position based on a target entity.
 * @responsibility Apply viewport clamping based on defined bounds.
 * @responsibility Manage cosmetic 'shake' effects via timer-based decay.
 *
 * @conceptualRisk [Z-INDEX_FLICKER] This system does not handle depth planes, only 2D position.
 * @conceptualRisk [ASYNC_SHAKE] Use of `setTimeout` for shake decay is NON-DETERMINISTIC
 * and may cause desync in replays/recordings.
 * @conceptualRisk [FRAME_RATE_DEPENDENCE] Position LERP is frame-rate dependent (does not compensate for dt).
 */
export class CameraSystem {
  /** Entity ID of the transform component to follow. */
  private targetEntityId: number | null = null;
  /** Viewport boundaries to constrain the camera. */
  private bounds: { minX: number; minY: number; maxX: number; maxY: number } | null = null;
  /** Linear interpolation factor for movement smoothing. @defaultValue 0.1 */
  private lerpFactor: number = 0.1;

  /**
   * Creates a new CameraSystem instance.
   * @param sharedCamera - The shared value used to communicate state to the renderer.
   */
  constructor(private sharedCamera: SharedCamera) {}

  /**
   * Sets an entity to be followed by the camera.
   *
   * @param entityId - Target entity ID or null to stop following.
   * @param options - Additional settings like lerp factor.
   */
  follow(entityId: number | null, options: { lerp?: number } = {}): void {
    this.targetEntityId = entityId;
    if (options.lerp !== undefined) this.lerpFactor = options.lerp;
  }

  /**
   * Sets the world boundaries for the camera.
   * @param bounds - Min/Max coordinates or null to disable clamping.
   */
  setBounds(bounds: { minX: number; minY: number; maxX: number; maxY: number } | null): void {
    this.bounds = bounds;
  }

  /**
   * Triggers a screen shake effect.
   *
   * @param intensity - Magnitude of the shake.
   * @param duration - Duration in milliseconds before resetting.
   *
   * @sideEffect Starts a `setTimeout` that mutates `sharedCamera.value` outside the main loop.
   */
  shake(intensity: number, duration: number = 500): void {
    this.sharedCamera.value = {
      ...this.sharedCamera.value,
      shakeIntensity: intensity,
    };

    // Decay shake intensity over time
    setTimeout(() => {
      this.sharedCamera.value = {
        ...this.sharedCamera.value,
        shakeIntensity: 0,
      };
    }, duration);
  }

  /**
   * Updates the camera position based on its target.
   *
   * @param world - The ECS world to query for target Transform.
   * @param _deltaTime - Elapsed time (currently unused, contributing to frame-rate dependence).
   * @param viewportSize - Current dimensions of the visible area.
   *
   * @mutates {@link sharedCamera} - Updates x and y properties.
   */
  update(world: World, _deltaTime: number, viewportSize: { width: number; height: number }): void {
    if (this.targetEntityId !== null) {
      const transform = world.getComponent<TransformComponent>(this.targetEntityId, "Transform");
      if (transform) {
        let targetX = transform.x - viewportSize.width / 2;
        let targetY = transform.y - viewportSize.height / 2;

        // Apply bounds clamping
        if (this.bounds) {
          targetX = Math.max(this.bounds.minX, Math.min(this.bounds.maxX - viewportSize.width, targetX));
          targetY = Math.max(this.bounds.minY, Math.min(this.bounds.maxY - viewportSize.height, targetY));
        }

        // Lerp camera position
        this.sharedCamera.value = {
          ...this.sharedCamera.value,
          x: this.sharedCamera.value.x + (targetX - this.sharedCamera.value.x) * this.lerpFactor,
          y: this.sharedCamera.value.y + (targetY - this.sharedCamera.value.y) * this.lerpFactor,
        };
      }
    }

    // Apply screen shake offset dynamically in the renderer (later)
  }

  /**
   * Projects a world coordinate to screen space.
   *
   * @param point - World coordinates.
   * @returns Coordinates in pixels relative to viewport.
   */
  worldToScreen(point: { x: number; y: number }): { x: number; y: number } {
    const cam = this.sharedCamera.value;
    return {
      x: (point.x - cam.x) * cam.zoom,
      y: (point.y - cam.y) * cam.zoom,
    };
  }

  /**
   * Unprojects a screen coordinate to world space.
   *
   * @param point - Screen coordinates in pixels.
   * @returns Coordinates in world units.
   */
  screenToWorld(point: { x: number; y: number }): { x: number; y: number } {
    const cam = this.sharedCamera.value;
    return {
      x: point.x / cam.zoom + cam.x,
      y: point.y / cam.zoom + cam.y,
    };
  }
}
