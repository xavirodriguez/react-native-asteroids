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
  data: Record<string, unknown> | null;
}

/**
 * UI element state data for rendering.
 */
export interface UISnapshotData {
  buttonState?: "idle" | "hovered" | "pressed" | "disabled";
  [key: string]: unknown;
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
  style?: import("../ui/UITypes").UIStyleComponent | null;
  text?: import("../ui/UITypes").UITextComponent | null;
  progressBar?: import("../ui/UITypes").UIProgressBarComponent | null;
  data?: UISnapshotData | null;
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
  backgroundData?: Record<string, unknown> | null;
  foregroundData?: Record<string, unknown> | null;
}
