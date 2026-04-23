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
 * Sistema de Cámara 2D para TinyAsterEngine.
 *
 * @responsibility Gestionar el seguimiento de múltiples objetivos con suavizado.
 * @responsibility Implementar áreas de zona muerta (deadzone) para un control de cámara orgánico.
 * @responsibility Manejar efectos de vibración (screen shake) con decaimiento controlado.
 *
 * @remarks
 * Utiliza interpolación exponencial para el suavizado (Lerp), con la intención de ofrecer una respuesta
 * fluida bajo diversas tasas de refresco (30, 60, 120+ FPS).
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
    const buffer = world.getCommandBuffer();

    for (let i = 0; i < cameras.length; i++) {
      const camEntity = cameras[i];
      const cam = { ...world.getComponent<Camera2DComponent>(camEntity, "Camera2D")! };

      // Determine targets (combine targetEntity and targets array)
      const targets: Entity[] = [];
      if (cam.targetEntity !== undefined) {
        targets.push(cam.targetEntity);
      }
      if (cam.targets) {
        for (const t of cam.targets) {
          if (!targets.includes(t)) targets.push(t);
        }
      }

      if (targets.length > 0) {
        let avgX = 0;
        let avgY = 0;
        let validTargets = 0;

        for (const targetId of targets) {
          const targetPos = world.getComponent<TransformComponent>(targetId, "Transform");
          if (targetPos) {
            // Use world coordinates if available for accurate tracking in hierarchies
            avgX += targetPos.worldX ?? targetPos.x;
            avgY += targetPos.worldY ?? targetPos.y;
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
            // Deadzone logic: Only move camera if focal point exceeds deadzone bounds relative to center
            const centerX = cam.x + viewW / 2 - cam.offset.x;
            const centerY = cam.y + viewH / 2 - cam.offset.y;

            const relX = (focalX - centerX) * cam.zoom;
            const relY = (focalY - centerY) * cam.zoom;

            let moveX = 0;
            let moveY = 0;

            if (relX < cam.deadzone.minX) moveX = relX - cam.deadzone.minX;
            else if (relX > cam.deadzone.maxX) moveX = relX - cam.deadzone.maxX;

            if (relY < cam.deadzone.minY) moveY = relY - cam.deadzone.minY;
            else if (relY > cam.deadzone.maxY) moveY = relY - cam.deadzone.maxY;

            targetCamX = cam.x + moveX / cam.zoom;
            targetCamY = cam.y + moveY / cam.zoom;
          }

          // Exponential Smoothing (Lerp-like behavior over time)
          // t = 1 - exp(-lambda * dt)
          const smoothingFactor = cam.smoothing > 0 ? cam.smoothing : 1;
          const lambda = smoothingFactor * 60;
          const t = smoothingFactor >= 1 ? 1 : 1 - Math.exp(-lambda * dtSeconds);

          cam.x += (targetCamX - cam.x) * t;
          cam.y += (targetCamY - cam.y) * t;
        }
      }

      // Apply bounds constraints
      if (cam.bounds) {
        const viewW = this.viewport.width / cam.zoom;
        const viewH = this.viewport.height / cam.zoom;
        cam.x = Math.max(cam.bounds.minX, Math.min(cam.bounds.maxX - viewW, cam.x));
        cam.y = Math.max(cam.bounds.minY, Math.min(cam.bounds.maxY - viewH, cam.y));
      }

      // Process Screen Shake decay
      if (cam.shakeIntensity > 0) {
        const renderRandom = RandomService.getInstance("render");
        cam.shakeOffsetX = (renderRandom.next() - 0.5) * cam.shakeIntensity;
        cam.shakeOffsetY = (renderRandom.next() - 0.5) * cam.shakeIntensity;

        const decayLambda = 5.0; // Decay rate
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

      // Defer state update using WorldCommandBuffer
      buffer.addComponent(camEntity, cam);
    }
  }

  /**
   * Configura la cámara principal para seguir a una entidad.
   */
  public static follow(world: World, target: Entity): void {
    const cam = world.getSingleton<Camera2DComponent>("Camera2D");
    if (cam) {
      const [camEntity] = world.query("Camera2D");
      const updatedCam = { ...cam, targetEntity: target, targets: [] };
      world.getCommandBuffer().addComponent(camEntity, updatedCam);
    }
  }

  /**
   * Añade un objetivo adicional al seguimiento de la cámara.
   */
  public static addTarget(world: World, target: Entity): void {
    const cam = world.getSingleton<Camera2DComponent>("Camera2D");
    if (cam) {
      if (!cam.targets.includes(target)) {
        const [camEntity] = world.query("Camera2D");
        const updatedCam = { ...cam, targets: [...cam.targets, target] };
        world.getCommandBuffer().addComponent(camEntity, updatedCam);
      }
    }
  }

  /**
   * Activa un efecto de vibración en la cámara principal.
   */
  public static shake(world: World, intensity: number): void {
    const cam = world.getSingleton<Camera2DComponent>("Camera2D");
    if (cam) {
      const [camEntity] = world.query("Camera2D");
      const updatedCam = { ...cam, shakeIntensity: intensity };
      world.getCommandBuffer().addComponent(camEntity, updatedCam);
    }
  }

  /**
   * Transforma una posición del mundo a coordenadas de pantalla.
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
