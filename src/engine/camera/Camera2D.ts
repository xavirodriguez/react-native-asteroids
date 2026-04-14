import { System } from "../core/System";
import { World } from "../core/World";
import { Camera2DComponent, TransformComponent, Entity } from "../types/EngineTypes";
import { RandomService } from "../utils/RandomService";

export interface CameraConfig {
  viewport: { width: number; height: number };
  bounds?: { minX: number; minY: number; maxX: number; maxY: number };
  smoothing?: number;
  offset?: { x: number; y: number };
}

/**
 * Platform-agnostic 2D Camera logic.
 *
 * @remarks
 * Implements frame-rate independent interpolation and shake effects using
 * delta-time based exponential smoothing.
 */
export class Camera2D extends System {
  private viewport = { width: 800, height: 600 };

  constructor(config?: CameraConfig) {
    super();
    if (config) {
      this.viewport = config.viewport;
    }
  }

  public setViewport(width: number, height: number): void {
    this.viewport = { width, height };
  }

  /**
   * Updates all active cameras in the world.
   *
   * @param world - The ECS world.
   * @param deltaTime - Elapsed time in milliseconds.
   */
  public update(world: World, deltaTime: number): void {
    const cameras = world.query("Camera2D");
    const dtSeconds = deltaTime / 1000;

    cameras.forEach((camEntity) => {
      const cam = world.getComponent<Camera2DComponent>(camEntity, "Camera2D")!;

      if (cam.target !== undefined) {
        const targetPos = world.getComponent<TransformComponent>(cam.target, "Transform");
        if (targetPos) {
          const targetX = targetPos.x - this.viewport.width / (2 * cam.zoom) + cam.offset.x;
          const targetY = targetPos.y - this.viewport.height / (2 * cam.zoom) + cam.offset.y;

          // Apply exponential smoothing: t = 1 - exp(-lambda * dt)
          // Ensures identical behavior across 30/60/120 FPS
          const lambda = (cam.smoothing ?? 0.1) * 60;
          const t = 1 - Math.exp(-lambda * dtSeconds);

          cam.x += (targetX - cam.x) * t;
          cam.y += (targetY - cam.y) * t;
        }
      }

      // Apply bounds
      if (cam.bounds) {
        cam.x = Math.max(cam.bounds.minX, Math.min(cam.bounds.maxX - this.viewport.width / cam.zoom, cam.x));
        cam.y = Math.max(cam.bounds.minY, Math.min(cam.bounds.maxY - this.viewport.height / cam.zoom, cam.y));
      }

      // Handle shake decay with exponential decay for FPS independence
      if (cam.shakeIntensity > 0) {
        const renderRandom = RandomService.getInstance("render");
        cam.shakeOffsetX = (renderRandom.next() - 0.5) * cam.shakeIntensity;
        cam.shakeOffsetY = (renderRandom.next() - 0.5) * cam.shakeIntensity;

        // I = I0 * exp(-decay * dt)
        const decayLambda = 5.0;
        cam.shakeIntensity *= Math.exp(-decayLambda * dtSeconds);

        if (cam.shakeIntensity < 0.1) {
            cam.shakeIntensity = 0;
            cam.shakeOffsetX = 0;
            cam.shakeOffsetY = 0;
        }
      } else {
        cam.shakeOffsetX = 0;
        cam.shakeOffsetY = 0;
      }
    });
  }

  public static follow(world: World, target: Entity): void {
    const cam = world.getSingleton<Camera2DComponent>("Camera2D");
    if (cam) {
      cam.target = target;
    }
  }

  public static shake(world: World, intensity: number): void {
    const cam = world.getSingleton<Camera2DComponent>("Camera2D");
    if (cam) {
      cam.shakeIntensity = intensity;
    }
  }

  public static worldToScreen(worldPos: { x: number; y: number }, cam: Camera2DComponent): { x: number; y: number } {
    const shakeX = cam.shakeOffsetX || 0;
    const shakeY = cam.shakeOffsetY || 0;
    return {
      x: (worldPos.x - cam.x + shakeX) * cam.zoom,
      y: (worldPos.y - cam.y + shakeY) * cam.zoom,
    };
  }

  public static screenToWorld(screenPos: { x: number; y: number }, cam: Camera2DComponent): { x: number; y: number } {
    const shakeX = cam.shakeOffsetX || 0;
    const shakeY = cam.shakeOffsetY || 0;
    return {
      x: screenPos.x / cam.zoom + cam.x - shakeX,
      y: screenPos.y / cam.zoom + cam.y - shakeY,
    };
  }
}
