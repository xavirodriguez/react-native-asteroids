import { System } from "../core/System";
import { World } from "../core/World";
import { Camera2DComponent, TransformComponent, Entity } from "../core/CoreComponents";
import { RandomService } from "../utils/RandomService";

export interface CameraConfig {
  viewport: { width: number; height: number };
  bounds?: { minX: number; minY: number; maxX: number; maxY: number };
  smoothing?: number;
  offset?: { x: number; y: number };
}

/**
 * Sistema de Cámara 2D Profesional para TinyAsterEngine.
 *
 * @responsibility Gestionar el seguimiento de múltiples objetivos con suavizado.
 * @responsibility Implementar áreas de zona muerta (deadzone) para un control de cámara orgánico.
 * @responsibility Manejar efectos de vibración (screen shake) con decaimiento determinista.
 *
 * @remarks
 * Utiliza interpolación exponencial para el suavizado, lo que garantiza una respuesta
 * fluida e independiente de la tasa de frames (30, 60, 120+ FPS).
 * Las coordenadas de la cámara representan la esquina superior izquierda de la vista en el espacio del mundo.
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
   * Actualiza todas las cámaras activas en el mundo.
   *
   * @param world - El mundo ECS.
   * @param deltaTime - Tiempo transcurrido en milisegundos.
   */
  public update(world: World, deltaTime: number): void {
    const cameras = world.query("Camera2D");
    const dtSeconds = deltaTime / 1000;

    for (let i = 0; i < cameras.length; i++) {
      const camEntity = cameras[i];
      const cam = world.getComponent<Camera2DComponent>(camEntity, "Camera2D")!;

      if (cam.targets && cam.targets.length > 0) {
        let avgX = 0;
        let avgY = 0;
        let validTargets = 0;

        for (const targetId of cam.targets) {
          const targetPos = world.getComponent<TransformComponent>(targetId, "Transform");
          if (targetPos) {
            avgX += targetPos.x;
            avgY += targetPos.y;
            validTargets++;
          }
        }

        if (validTargets > 0) {
          const focalX = avgX / validTargets;
          const focalY = avgY / validTargets;

          const viewW = this.viewport.width / cam.zoom;
          const viewH = this.viewport.height / cam.zoom;

          let targetCamX = focalX - viewW / 2 + cam.offset.x;
          let targetCamY = focalY - viewH / 2 + cam.offset.y;

          if (cam.deadzone) {
            // Centro actual de la cámara en el espacio del mundo
            const currentCenterX = cam.x + viewW / 2 - cam.offset.x;
            const currentCenterY = cam.y + viewH / 2 - cam.offset.y;

            // Posición relativa del punto focal respecto al centro de la cámara (en píxeles de pantalla)
            const relX = (focalX - currentCenterX) * cam.zoom;
            const relY = (focalY - currentCenterY) * cam.zoom;

            let moveX = 0;
            let moveY = 0;

            if (relX < cam.deadzone.minX) moveX = relX - cam.deadzone.minX;
            else if (relX > cam.deadzone.maxX) moveX = relX - cam.deadzone.maxX;

            if (relY < cam.deadzone.minY) moveY = relY - cam.deadzone.minY;
            else if (relY > cam.deadzone.maxY) moveY = relY - cam.deadzone.maxY;

            // Ajustar la posición objetivo solo si el foco sale de la zona muerta
            targetCamX = cam.x + moveX / cam.zoom;
            targetCamY = cam.y + moveY / cam.zoom;
          }

          // Suavizado exponencial: t = 1 - exp(-lambda * dt)
          const lambda = (cam.smoothing ?? 0.1) * 60;
          const t = 1 - Math.exp(-lambda * dtSeconds);

          cam.x += (targetCamX - cam.x) * t;
          cam.y += (targetCamY - cam.y) * t;
        }
      }

      // Aplicar límites (bounds)
      if (cam.bounds) {
        const viewW = this.viewport.width / cam.zoom;
        const viewH = this.viewport.height / cam.zoom;
        cam.x = Math.max(cam.bounds.minX, Math.min(cam.bounds.maxX - viewW, cam.x));
        cam.y = Math.max(cam.bounds.minY, Math.min(cam.bounds.maxY - viewH, cam.y));
      }

      // Procesar decaimiento de vibración
      if (cam.shakeIntensity > 0) {
        const renderRandom = RandomService.getInstance("render");
        cam.shakeOffsetX = (renderRandom.next() - 0.5) * cam.shakeIntensity;
        cam.shakeOffsetY = (renderRandom.next() - 0.5) * cam.shakeIntensity;

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
   * Configura la cámara principal para seguir a una entidad.
   */
  public static follow(world: World, target: Entity): void {
    const cam = world.getSingleton<Camera2DComponent>("Camera2D");
    if (cam) {
      cam.targets = [target];
    }
  }

  /**
   * Añade un objetivo adicional al seguimiento de la cámara.
   */
  public static addTarget(world: World, target: Entity): void {
    const cam = world.getSingleton<Camera2DComponent>("Camera2D");
    if (cam) {
      if (!cam.targets.includes(target)) {
        cam.targets.push(target);
      }
    }
  }

  /**
   * Activa un efecto de vibración en la cámara principal.
   */
  public static shake(world: World, intensity: number): void {
    const cam = world.getSingleton<Camera2DComponent>("Camera2D");
    if (cam) {
      cam.shakeIntensity = intensity;
    }
  }

  /**
   * Transforma una posición del mundo a coordenadas de pantalla.
   *
   * @remarks
   * La vibración (shake) se aplica en píxeles de pantalla al final de la transformación.
   */
  public static worldToScreen(worldPos: { x: number; y: number }, cam: Camera2DComponent): { x: number; y: number } {
    const shakeX = cam.shakeOffsetX || 0;
    const shakeY = cam.shakeOffsetY || 0;
    return {
      x: (worldPos.x - cam.x) * cam.zoom + shakeX,
      y: (worldPos.y - cam.y) * cam.zoom + shakeY,
    };
  }

  /**
   * Transforma una posición de pantalla a coordenadas del mundo.
   *
   * @remarks
   * Realiza la operación inversa a {@link worldToScreen}.
   */
  public static screenToWorld(screenPos: { x: number; y: number }, cam: Camera2DComponent): { x: number; y: number } {
    const shakeX = cam.shakeOffsetX || 0;
    const shakeY = cam.shakeOffsetY || 0;
    return {
      x: (screenPos.x - shakeX) / cam.zoom + cam.x,
      y: (screenPos.y - shakeY) / cam.zoom + cam.y,
    };
  }
}
