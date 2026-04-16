import { useSharedValue } from "react-native-reanimated";
import { CameraState, SharedCamera } from "../core/types/SystemTypes";
import { World } from "../core/World";
import { TransformComponent } from "../core/CoreComponents";

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
 * CameraSystem: Gestiona la lógica de la cámara (seguimiento, lerp, sacudida y límites).
 *
 * @deprecated Este sistema depende de `react-native-reanimated` (SharedValue).
 * Usar {@link Camera2D} para una implementación agnóstica de la plataforma y determinista.
 *
 * @responsibility Calcular la posición de la cámara basada en un objetivo.
 * @responsibility Aplicar límites (clamping) a la vista.
 * @responsibility Gestionar efectos cosméticos como `shake`.
 *
 * @conceptualRisk [Z-INDEX_FLICKER] Este sistema no maneja planos de profundidad, solo posición 2D.
 * @conceptualRisk [ASYNC_SHAKE] El uso de `setTimeout` para el decaimiento del shake es NO DETERMINISTA
 * y puede causar desincronización en grabaciones/replays.
 * @conceptualRisk [FRAME_RATE_DEPENDENCE] El lerp de posición es dependiente del framerate (no compensa dt).
 */
export class CameraSystem {
  private targetEntityId: number | null = null;
  private bounds: { minX: number; minY: number; maxX: number; maxY: number } | null = null;
  private lerpFactor: number = 0.1;

  constructor(private sharedCamera: SharedCamera) {}

  /**
   * Configura una entidad para ser seguida por la cámara.
   * @param entityId - ID de la entidad objetivo o null para dejar de seguir.
   */
  follow(entityId: number | null, options: { lerp?: number } = {}): void {
    this.targetEntityId = entityId;
    if (options.lerp !== undefined) this.lerpFactor = options.lerp;
  }

  setBounds(bounds: { minX: number; minY: number; maxX: number; maxY: number } | null): void {
    this.bounds = bounds;
  }

  /**
   * Activa un efecto de sacudida de pantalla.
   * @param intensity - Magnitud de la sacudida.
   * @param duration - Duración en milisegundos.
   * @sideEffect Inicia un temporizador `setTimeout` que muta `sharedCamera.value` fuera del bucle de juego.
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
   * Actualiza la posición de la cámara.
   * @param world - El mundo ECS para buscar el Transform del objetivo.
   * @param deltaTime - Tiempo transcurrido (actualmente no se usa para el lerp, riesgo de drift).
   * @param viewportSize - Dimensiones del área visible.
   * @mutates sharedCamera
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
