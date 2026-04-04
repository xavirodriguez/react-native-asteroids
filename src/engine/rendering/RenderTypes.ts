import { Entity, Transform } from "../types/EngineTypes";

/**
 * Commands emitted by the RenderSystem to be consumed by the adapter.
 */
export interface RenderCommand {
  type: 'sprite' | 'rect' | 'circle' | 'line';
  entityId: Entity;
  worldTransform: Transform;
  alpha: number; // For interpolation
  textureId?: string;
  width?: number;
  height?: number;
  radius?: number;
  color?: string;
  zOrder: number;
  visible: boolean;
}

/**
 * Interface for the rendering adapter.
 * Can be implemented for Skia, Canvas, SVG, etc.
 */
export interface Renderer {
  beginFrame(alpha: number): void;
  submit(command: RenderCommand): void;
  endFrame(): void;
}
