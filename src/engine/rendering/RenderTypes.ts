import { Entity, Transform } from "../types/EngineTypes";

/**
 * Comandos emitidos por el `RenderSystem` para ser consumidos por el adaptador.
 *
 * @remarks
 * Representa una operación de dibujo atómica y agnóstica a la plataforma.
 *
 * @conceptualRisk [ALLOCATION_FREE][HIGH] Estas interfaces deben ser implementadas
 * por objetos en un pool para evitar recolectores de basura durante el renderizado.
 */
export interface RenderCommand {
  type: string;
  entityId: Entity;
  worldTransform: Transform;
  alpha: number; // For interpolation
  textureId?: string;
  width?: number;
  height?: number;
  radius?: number;
  color?: string;
  zIndex: number;
  visible: boolean;
}

/**
 * Interfaz para el adaptador de renderizado.
 * Implementada por backends específicos como Skia, Canvas o SVG.
 *
 * @responsibility Preparar el lienzo para un nuevo frame.
 * @responsibility Procesar comandos de dibujo individuales de forma eficiente.
 * @responsibility Finalizar el frame y presentar el resultado visual.
 */
export interface Renderer {
  /**
   * Inicia el ciclo de renderizado de un frame.
   * @param alpha - Factor de interpolación (0-1) para suavizar el movimiento.
   */
  beginFrame(alpha: number): void;

  /**
   * Recibe un comando de dibujo para ser procesado.
   * @param command - Los datos del comando a dibujar.
   */
  submit(command: RenderCommand): void;

  /**
   * Finaliza el frame actual.
   */
  endFrame(): void;
}
