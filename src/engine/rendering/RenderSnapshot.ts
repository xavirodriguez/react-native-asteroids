import { Entity } from "../core/Entity";

/**
 * Snapshot de una entidad para renderizado.
 */
export interface RenderEntitySnapshot {
  id: Entity;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  zIndex: number;
  shape: string;
  color: string;
  size: number;
  vertices: { x: number, y: number }[] | null;
  hitFlashFrames: number;
  // Metadata for custom drawers
  data: any;
}

/**
 * Snapshot completo de un frame.
 */
export interface RenderSnapshot {
  entities: RenderEntitySnapshot[];
  entityCount: number;
  shakeX: number;
  shakeY: number;
}
