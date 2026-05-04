/**
 * Snapshot definitions for decoupled rendering.
 *
 * This module provides the data structures used to capture a consistent state
 * of the ECS world at a specific point in time. The renderer consumes these
 * snapshots to draw frames without needing direct access to the live World.
 *
 * @packageDocumentation
 */

import { Entity } from "../core/Entity";

/**
 * Visual snapshot of an individual entity.
 *
 * @remarks
 * Contains pre-interpolated and transformed data ready for immediate drawing.
 *
 * @public
 */
export interface RenderEntitySnapshot {
  id: Entity;
  /** [px] Visual X position. */
  x: number;
  /** [px] Visual Y position. */
  y: number;
  /** [rad] Visual rotation. */
  rotation: number;
  scaleX: number;
  scaleY: number;
  /** [0, 1] Transparency. */
  opacity: number;
  /** Draw order. */
  zIndex: number;
  /** Identifier for the drawer. */
  shape: string;
  color: string;
  /** [px] Primary size. */
  size: number;
  vertices: { x: number, y: number }[] | null;
  /** White hit-effect frames remaining. */
  hitFlashFrames: number;
  /** Custom drawer metadata. */
  data: Record<string, unknown> | null;
}

/**
 * UI-specific state data.
 */
export interface UISnapshotData {
  buttonState?: "idle" | "hovered" | "pressed" | "disabled";
  [key: string]: unknown;
}

/**
 * Snapshot of a UI element for HUD rendering.
 *
 * @public
 */
export interface UISnapshot {
  id: Entity;
  /** UI element discriminator (e.g., "button", "text"). */
  elementType: string;
  /** [px] Viewport-relative X. */
  x: number;
  /** [px] Viewport-relative Y. */
  y: number;
  /** [px] Element width. */
  width: number;
  /** [px] Element height. */
  height: number;
  /** [0, 1] Alpha. */
  opacity: number;
  visible: boolean;
  /** Sorting layer. */
  zIndex: number;
  style?: import("../ui/UITypes").UIStyleComponent | null;
  text?: import("../ui/UITypes").UITextComponent | null;
  progressBar?: import("../ui/UITypes").UIProgressBarComponent | null;
  data?: UISnapshotData | null;
}

/**
 * Complete state representation of a single rendering frame.
 *
 * @responsibility Decouple state capture from drawing logic.
 * @responsibility Ensure visual consistency across a single frame.
 *
 * @remarks
 * This structure prevents inconsistent visual states caused by simulation
 * updates occurring mid-frame. It is typically passed to custom
 * {@link EffectDrawer} callbacks.
 *
 * @public
 */
export interface RenderSnapshot {
  /** Pooled array of entity snapshots. */
  entities: RenderEntitySnapshot[];
  /** Number of valid entities in the pool for this frame. */
  entityCount: number;
  /** Pooled array of UI snapshots. */
  uiElements: UISnapshot[];
  /** Number of valid UI elements. */
  uiCount: number;
  /** [px] Cumulative horizontal camera shake. */
  shakeX: number;
  /** [px] Cumulative vertical camera shake. */
  shakeY: number;
  /** [px] World camera focal X. */
  cameraX: number;
  /** [px] World camera focal Y. */
  cameraY: number;
  /** Camera zoom multiplier. */
  cameraZoom: number;
  /** [ms] Total simulation time elapsed. */
  elapsedTime: number;
  /** Arbitrary background effect data. */
  backgroundData?: Record<string, unknown> | null;
  /** Arbitrary foreground/post-process data. */
  foregroundData?: Record<string, unknown> | null;
}
