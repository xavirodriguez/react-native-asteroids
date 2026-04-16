/**
 * @packageDocumentation
 * Core UI Type Definitions.
 * Defines the components and data structures used by the ECS UI system.
 */

import { Component } from "../core/Component";
import { Entity } from "../core/Entity";

/** Viewport-relative positioning anchor. */
export type UIAnchor =
  | "top-left" | "top-center" | "top-right"
  | "center-left" | "center" | "center-right"
  | "bottom-left" | "bottom-center" | "bottom-right";

/** Layout direction for containers. */
export type UILayoutDirection = "horizontal" | "vertical";

/** Child alignment within a container. */
export type UIAlign = "start" | "center" | "end" | "stretch";

/** Unit of measurement for UI dimensions. */
export type UIUnit = "px" | "%" ;

/** Represents a dimension or offset value with its associated unit. */
export interface UIValue {
  value: number;
  unit: UIUnit;
}

/** Definition for padding or margin in four directions. */
export interface UIEdgeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Fundamental UI component for all visible interface entities.
 *
 * @remarks
 * This component holds the 'source of truth' for layout rules (anchors, offsets, units)
 * as well as the 'computed result' (screen coordinates and pixel dimensions)
 * calculated by the {@link UILayoutSystem}.
 *
 * @responsibility Store layout constraints and computed results for a UI entity.
 */
export interface UIElementComponent extends Component {
  type: "UIElement";
  /** The semantic type of the element. Influences which systems/renderers process it. */
  elementType: "panel" | "label" | "button" | "progressBar" | "image" | "container";
  /** Viewport-relative anchor point. */
  anchor: UIAnchor;
  /** Horizontal offset relative to the anchor or parent. */
  offsetX: number;
  /** Vertical offset relative to the anchor or parent. */
  offsetY: number;
  /** Width constraint. */
  width: UIValue;
  /** Height constraint. */
  height: UIValue;
  /** Internal spacing between the boundary and children. */
  padding: UIEdgeInsets;
  /** Toggle visibility without removing the entity. */
  visible: boolean;
  /** Global transparency (0.0 to 1.0). */
  opacity: number;
  /** Rendering order. Higher values appear on top. */
  zIndex: number;
  /** Whether the element should block and receive pointer events. */
  interactive: boolean;
  /** Entity ID of the parent UI element. `null` for root elements. */
  parentEntity: Entity | null;

  // Computed values (read-only for most users, updated by LayoutSystem)
  /** Resolved X screen coordinate in pixels. */
  computedX: number;
  /** Resolved Y screen coordinate in pixels. */
  computedY: number;
  /** Resolved width in pixels. */
  computedWidth: number;
  /** Resolved height in pixels. */
  computedHeight: number;
}

/**
 * Styling properties for decorative elements like panels and buttons.
 */
export interface UIStyleComponent extends Component {
  type: "UIStyle";
  /** Fill color string (e.g., "#FFF", "rgba(...)"). `null` for transparent. */
  backgroundColor: string | null;
  /** Outline color string. */
  borderColor: string | null;
  /** Thickness of the border in pixels. */
  borderWidth: number;
  /** Radius for rounded corners in pixels. */
  borderRadius: number;
  /** Color for associated text components. */
  textColor: string;
  /** Font size in pixels. */
  fontSize: number;
  /** Text alignment. */
  textAlign: "left" | "center" | "right";
  /** Name of the font family. */
  fontFamily: string;
}

/**
 * Component for entities that display static or dynamic text.
 */
export interface UITextComponent extends Component {
  type: "UIText";
  /** The string content to render. */
  content: string;
  /** Whether the text should automatically wrap based on element width. */
  wordWrap: boolean;
  /** Maximum number of lines to render. 0 for unlimited. */
  maxLines: number;
}

/**
 * Component for visualizing progress or health bars.
 */
export interface UIProgressBarComponent extends Component {
  type: "UIProgressBar";
  /** Current progress value (0.0 to 1.0). */
  value: number;
  /** Color of the progress indicator. */
  fillColor: string;
  /** Color of the background bar. */
  trackColor: string;
  /** Fill orientation. */
  direction: "left-to-right" | "right-to-left" | "bottom-to-top" | "top-to-bottom";
}

/**
 * Logic for automatic child arrangement (Flex-like).
 */
export interface UIContainerComponent extends Component {
  type: "UIContainer";
  /** Stacking direction. */
  direction: UILayoutDirection;
  /** Alignment of children in the cross-axis. */
  align: UIAlign;
  /** Pixel spacing between children. */
  gap: number;
}

/**
 * State tracking for interactive elements.
 * @see {@link UIInputSystem}
 */
export interface UIButtonStateComponent extends Component {
  type: "UIButtonState";
  /** Current interaction state. */
  state: "idle" | "hovered" | "pressed" | "disabled";
  /** Identifier for the action to trigger when clicked. */
  actionId: string;
  /** Transient flag set to `true` on the frame the button is clicked. */
  clicked: boolean;
}

/**
 * Component for displaying texture assets.
 */
export interface UIImageComponent extends Component {
  type: "UIImage";
  /** Key of the texture in the AssetLoader/Cache. */
  textureKey: string;
  /** Scaling strategy within the element boundaries. */
  scaleMode: "stretch" | "fit" | "fill" | "none";
}

/**
 * Bridges the world-space and screen-space by pinning UI to an entity.
 */
export interface UIWorldAttachComponent extends Component {
  type: "UIWorldAttach";
  /** The game entity ID to follow. */
  targetEntity: Entity;
  /** Offset in world units from the target position. */
  worldOffsetX: number;
  /** Offset in world units from the target position. */
  worldOffsetY: number;
  /** Whether to compensate for the camera position (projection). */
  useCamera: boolean;
}
