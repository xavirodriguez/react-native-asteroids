/**
 * @packageDocumentation
 * Platform-agnostic 2D Camera subsystem.
 * Coordinates view transformations, target following, and screen-shake effects.
 */

import { System } from "../core/System";
import { World } from "../core/World";
import { Camera2DComponent, TransformComponent, Entity } from "../types/EngineTypes";
import { RandomService } from "../utils/RandomService";

/**
 * Configuration options for initializing the {@link Camera2D} system.
 */
export interface CameraConfig {
  /** Initial viewport dimensions in screen pixels. */
  viewport: { width: number; height: number };
  /** World boundaries to constrain the camera movement. */
  bounds?: { minX: number; minY: number; maxX: number; maxY: number };
  /**
   * Smoothing factor for target following.
   * Higher values mean faster tracking.
   * @defaultValue 0.1
   */
  smoothing?: number;
  /** Fixed offset from the target position. */
  offset?: { x: number; y: number };
}

/**
 * Platform-agnostic 2D Camera logic.
 *
 * @remarks
 * Implements frame-rate independent interpolation and shake effects using
 * delta-time based exponential smoothing: `t = 1 - exp(-lambda * dt)`.
 * This ensures identical behavior across 30, 60, and 120 FPS.
 *
 * The system operates on entities with the `Camera2D` component (see {@link Camera2DComponent}).
 * It typically updates after the physics/movement phase but before rendering.
 *
 * @example
 * ```ts
 * const cameraSystem = new Camera2D({
 *   viewport: { width: 1920, height: 1080 },
 *   smoothing: 0.15
 * });
 * world.addSystem(cameraSystem);
 *
 * // Make the camera follow the player
 * Camera2D.follow(world, playerEntity);
 * ```
 */
export class Camera2D extends System {
  /** Internal viewport dimensions used for calculations. */
  private viewport = { width: 800, height: 600 };

  /**
   * Creates a new Camera2D system instance.
   * @param config - Optional configuration for the viewport and behavior.
   */
  constructor(config?: CameraConfig) {
    super();
    if (config) {
      this.viewport = config.viewport;
    }
  }

  /**
   * Updates the viewport dimensions at runtime.
   * Useful for handling window resize events.
   *
   * @param width - New viewport width in pixels.
   * @param height - New viewport height in pixels.
   */
  public setViewport(width: number, height: number): void {
    this.viewport = { width, height };
  }

  /**
   * Updates all active cameras in the world.
   *
   * @param world - The ECS world containing camera and transform components.
   * @param deltaTime - Elapsed time since last frame in milliseconds.
   *
   * @remarks
   * For each camera entity, this method:
   * 1. Interpolates position towards the target (if any).
   * 2. Clamps the camera within defined bounds.
   * 3. Calculates and decays screen shake offsets.
   *
   * @mutates {@link Camera2DComponent} - Updates x, y, shakeOffsetX, shakeOffsetY, and shakeIntensity.
   */
  public update(world: World, deltaTime: number): void {
    const cameras = world.query("Camera2D");
    const dtSeconds = deltaTime / 1000;

    for (let i = 0; i < cameras.length; i++) {
      const camEntity = cameras[i];
      const cam = world.getComponent<Camera2DComponent>(camEntity, "Camera2D")!;

      if (cam.target !== undefined) {
        const targetPos = world.getComponent<TransformComponent>(cam.target, "Transform");
        if (targetPos) {
          const targetX = targetPos.x - this.viewport.width / (2 * cam.zoom) + cam.offset.x;
          const targetY = targetPos.y - this.viewport.height / (2 * cam.zoom) + cam.offset.y;

          // Apply exponential smoothing: t = 1 - exp(-lambda * dt)
          // lambda represents the "stiffness" of the smoothing.
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

        // Exponential decay: I = I0 * exp(-decay * dt)
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
    }
  }

  /**
   * Sets the follow target for the singleton camera.
   *
   * @param world - The ECS world.
   * @param target - Entity ID of the transform to follow.
   *
   * @precondition A singleton entity with `Camera2D` component must exist in the world.
   */
  public static follow(world: World, target: Entity): void {
    const cam = world.getSingleton<Camera2DComponent>("Camera2D");
    if (cam) {
      cam.target = target;
    }
  }

  /**
   * Triggers a screen shake effect on the singleton camera.
   *
   * @param world - The ECS world.
   * @param intensity - Initial magnitude of the shake in world units.
   *
   * @precondition A singleton entity with `Camera2D` component must exist in the world.
   */
  public static shake(world: World, intensity: number): void {
    const cam = world.getSingleton<Camera2DComponent>("Camera2D");
    if (cam) {
      cam.shakeIntensity = intensity;
    }
  }

  /**
   * Converts a world-space coordinate to screen-space coordinate.
   * Account for camera position, zoom, and current screen shake.
   *
   * @param worldPos - Vector in world units.
   * @param cam - The camera component state to use for transformation.
   * @returns Transformed coordinates in pixels relative to the viewport top-left.
   */
  public static worldToScreen(worldPos: { x: number; y: number }, cam: Camera2DComponent): { x: number; y: number } {
    const shakeX = cam.shakeOffsetX || 0;
    const shakeY = cam.shakeOffsetY || 0;
    return {
      x: (worldPos.x - cam.x + shakeX) * cam.zoom,
      y: (worldPos.y - cam.y + shakeY) * cam.zoom,
    };
  }

  /**
   * Converts a screen-space coordinate (e.g., from mouse input) to world-space.
   * Account for camera position, zoom, and current screen shake.
   *
   * @param screenPos - Vector in screen pixels relative to viewport top-left.
   * @param cam - The camera component state to use for transformation.
   * @returns Transformed coordinates in world units.
   */
  public static screenToWorld(screenPos: { x: number; y: number }, cam: Camera2DComponent): { x: number; y: number } {
    const shakeX = cam.shakeOffsetX || 0;
    const shakeY = cam.shakeOffsetY || 0;
    return {
      x: screenPos.x / cam.zoom + cam.x - shakeX,
      y: screenPos.y / cam.zoom + cam.y - shakeY,
    };
  }
}
