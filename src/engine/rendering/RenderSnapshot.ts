import { Entity } from "../core/Entity";

/**
 * Instantánea de una entidad capturada para renderizado.
 *
 * @remarks
 * Contiene el estado visual final (ya interpolado y con offsets aplicados) necesario
 * para que el renderer dibuje la entidad sin consultar el mundo de nuevo.
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
 * Snapshot completo de un frame de renderizado.
 *
 * @remarks
 * Esta estructura desacopla la fase de captura (que lee del World) de la fase de dibujo.
 * Permite que el renderizado sea determinista y evita problemas de concurrencia o
 * mutaciones del World durante el dibujo.
 */
export interface RenderSnapshot {
  /** Array pre-asignado de snapshots de entidades. */
  entities: RenderEntitySnapshot[];
  /** Número real de entidades capturadas en este snapshot. */
  entityCount: number;
  /** Array pre-asignado de snapshots de elementos de UI. */
  uiElements: UISnapshot[];
  /** Número real de elementos de UI capturados. */
  uiCount: number;
  /** Desplazamiento horizontal acumulado por efectos de Screen Shake. */
  shakeX: number;
  /** Desplazamiento vertical acumulado por efectos de Screen Shake. */
  shakeY: number;
  /** Posición X de la cámara en el mundo. */
  cameraX: number;
  /** Posición Y de la cámara en el mundo. */
  cameraY: number;
  /** Nivel de zoom de la cámara. */
  cameraZoom: number;
  /** Tiempo transcurrido (ms) desde el inicio de la simulación. */
  elapsedTime: number;
  /** Datos arbitrarios para efectos de fondo. */
  backgroundData?: Record<string, unknown> | null;
  /** Datos arbitrarios para efectos de primer plano. */
  foregroundData?: Record<string, unknown> | null;
}
