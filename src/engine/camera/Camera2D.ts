import { System } from "../core/System";
import { World } from "../core/World";
import { Camera2DComponent, TransformComponent } from "../types/EngineTypes";

/**
 * Platform-agnostic 2D Camera logic.
 * Handles target following, lerping, and screen shake.
 */
export class Camera2D extends System {
  public update(world: World, deltaTime: number): void {
    const cameras = world.query("Camera2D");
    const viewport = { width: 800, height: 600 }; // Default, could be injected

    cameras.forEach((camEntity) => {
      const cam = world.getComponent<Camera2DComponent>(camEntity, "Camera2D")!;

      if (cam.target !== undefined) {
        const targetPos = world.getComponent<TransformComponent>(cam.target, "Transform");
        if (targetPos) {
          const targetX = targetPos.x - viewport.width / (2 * cam.zoom) + cam.offset.x;
          const targetY = targetPos.y - viewport.height / (2 * cam.zoom) + cam.offset.y;

          // Apply smoothing (lerp)
          cam.x += (targetX - cam.x) * cam.smoothing;
          cam.y += (targetY - cam.y) * cam.smoothing;
        }
      }

      // Apply bounds
      if (cam.bounds) {
        cam.x = Math.max(cam.bounds.minX, Math.min(cam.bounds.maxX - viewport.width / cam.zoom, cam.x));
        cam.y = Math.max(cam.bounds.minY, Math.min(cam.bounds.maxY - viewport.height / cam.zoom, cam.y));
      }

      // Handle shake decay
      if (cam.shakeIntensity > 0) {
        cam.shakeIntensity -= deltaTime * 0.05; // Decay rate
        if (cam.shakeIntensity < 0) cam.shakeIntensity = 0;
      }
    });
  }

  /**
   * Shakes the camera with the given intensity.
   */
  public static shake(world: World, intensity: number): void {
    const cam = world.getSingleton<Camera2DComponent>("Camera2D");
    if (cam) {
      cam.shakeIntensity = intensity;
    }
  }

  /**
   * Transforms world coordinates to screen coordinates.
   */
  public static worldToScreen(worldPos: { x: number; y: number }, cam: Camera2DComponent): { x: number; y: number } {
    return {
      x: (worldPos.x - cam.x) * cam.zoom,
      y: (worldPos.y - cam.y) * cam.zoom,
    };
  }

  /**
   * Transforms screen coordinates to world coordinates.
   */
  public static screenToWorld(screenPos: { x: number; y: number }, cam: Camera2DComponent): { x: number; y: number } {
    return {
      x: screenPos.x / cam.zoom + cam.x,
      y: screenPos.y / cam.zoom + cam.y,
    };
  }
}
