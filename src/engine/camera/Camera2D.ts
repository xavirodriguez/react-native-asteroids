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
 * Lógica de Cámara 2D agnóstica a la plataforma.
 * Gestiona el seguimiento de objetivos, suavizado (lerping) y efectos de sacudida (screen shake).
 *
 * @responsibility Transformar coordenadas del mundo a coordenadas de pantalla y viceversa.
 * @responsibility Implementar suavizado de movimiento de cámara mediante interpolación.
 * @responsibility Gestionar el ciclo de vida y decaimiento del Screen Shake.
 *
 * @remarks
 * Esta clase opera sobre componentes `Camera2DComponent` y `TransformComponent`.
 * El Screen Shake utiliza `RandomService.getInstance("render")` para garantizar que
 * efectos visuales no afecten el determinismo de la simulación del juego.
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
   * Actualiza el estado de todas las cámaras activas en el mundo.
   *
   * @param world - El mundo ECS que contiene las cámaras.
   * @param deltaTime - Tiempo transcurrido en milisegundos.
   *
   * @invariant El Screen Shake debe decaer linealmente hasta llegar a cero.
   * @invariant El seguimiento del objetivo (follow) debe aplicar suavizado basado en `cam.smoothing`.
   * @conceptualRisk [FPS_DEPENDENCE] El suavizado actual `cam.smoothing` no está compensado
   * por deltaTime, lo que causa comportamientos diferentes a distintos framerates.
   */
  public update(world: World, deltaTime: number): void {
    const cameras = world.query("Camera2D");

    cameras.forEach((camEntity) => {
      const cam = world.getComponent<Camera2DComponent>(camEntity, "Camera2D")!;

      if (cam.target !== undefined) {
        const targetPos = world.getComponent<TransformComponent>(cam.target, "Transform");
        if (targetPos) {
          const targetX = targetPos.x - this.viewport.width / (2 * cam.zoom) + cam.offset.x;
          const targetY = targetPos.y - this.viewport.height / (2 * cam.zoom) + cam.offset.y;

          // Apply smoothing (lerp)
          cam.x += (targetX - cam.x) * cam.smoothing;
          cam.y += (targetY - cam.y) * cam.smoothing;
        }
      }

      // Apply bounds
      if (cam.bounds) {
        cam.x = Math.max(cam.bounds.minX, Math.min(cam.bounds.maxX - this.viewport.width / cam.zoom, cam.x));
        cam.y = Math.max(cam.bounds.minY, Math.min(cam.bounds.maxY - this.viewport.height / cam.zoom, cam.y));
      }

      // Handle shake decay and offset computation
      if (cam.shakeIntensity > 0) {
        const renderRandom = RandomService.getInstance("render");
        cam.shakeOffsetX = (renderRandom.next() - 0.5) * cam.shakeIntensity;
        cam.shakeOffsetY = (renderRandom.next() - 0.5) * cam.shakeIntensity;

        cam.shakeIntensity -= deltaTime * 0.05; // Decay rate
        if (cam.shakeIntensity < 0) {
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

  /**
   * Helper to set camera target.
   */
  public follow(world: World, target: Entity): void {
    const cam = world.getSingleton<Camera2DComponent>("Camera2D");
    if (cam) {
      cam.target = target;
    }
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
    const shakeX = cam.shakeOffsetX || 0;
    const shakeY = cam.shakeOffsetY || 0;
    return {
      x: (worldPos.x - cam.x + shakeX) * cam.zoom,
      y: (worldPos.y - cam.y + shakeY) * cam.zoom,
    };
  }

  /**
   * Transforms screen coordinates to world coordinates.
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
