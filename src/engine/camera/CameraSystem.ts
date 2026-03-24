import { useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { CameraState, SharedCamera } from "../core/types/SystemTypes";

/**
 * Hook to initialize a shared camera for the Skia renderer.
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
 * CameraSystem: Manages camera logic like follow, lerp, shake, and bounds.
 */
export class CameraSystem {
  private targetEntityId: number | null = null;
  private bounds: { minX: number; minY: number; maxX: number; maxY: number } | null = null;
  private lerpFactor: number = 0.1;

  constructor(private sharedCamera: SharedCamera) {}

  follow(entityId: number | null, options: { lerp?: number } = {}): void {
    this.targetEntityId = entityId;
    if (options.lerp !== undefined) this.lerpFactor = options.lerp;
  }

  setBounds(bounds: { minX: number; minY: number; maxX: number; maxY: number } | null): void {
    this.bounds = bounds;
  }

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

  update(world: any, deltaTime: number, viewportSize: { width: number; height: number }): void {
    if (this.targetEntityId !== null) {
      const transform = world.getComponent(this.targetEntityId, "Transform");
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

  worldToScreen(point: { x: number; y: number }): { x: number; y: number } {
    const cam = this.sharedCamera.value;
    return {
      x: (point.x - cam.x) * cam.zoom,
      y: (point.y - cam.y) * cam.zoom,
    };
  }

  screenToWorld(point: { x: number; y: number }): { x: number; y: number } {
    const cam = this.sharedCamera.value;
    return {
      x: point.x / cam.zoom + cam.x,
      y: point.y / cam.zoom + cam.y,
    };
  }
}
