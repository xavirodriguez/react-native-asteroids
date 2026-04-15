import { Entity } from "../core/Entity";

/**
 * Snapshot of an entity for rendering.
 *
 * @remarks
 * Contains captured visual state.
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
  data: any;
}

/**
 * Snapshot of a UI element.
 */
export interface UISnapshot {
  id: Entity;
  elementType: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  visible: boolean;
  zIndex: number;
  style?: any;
  text?: any;
  progressBar?: any;
}

/**
 * Complete rendering frame snapshot.
 */
export interface RenderSnapshot {
  entities: RenderEntitySnapshot[];
  entityCount: number;
  uiElements: UISnapshot[];
  uiCount: number;
  shakeX: number;
  shakeY: number;
  backgroundData?: any;
  foregroundData?: any;
}
