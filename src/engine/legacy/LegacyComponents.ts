import { Component } from "../core/Component";

/**
 * @deprecated Use TransformComponent instead.
 */
export interface PositionComponent extends Component {
  type: "Position";
  x: number;
  y: number;
}

/**
 * @deprecated Use Collider2DComponent instead.
 */
export interface ColliderComponent extends Component {
  type: "Collider";
  radius?: number;
  width?: number;
  height?: number;
}

/**
 * @deprecated Use TransformComponent instead.
 */
export interface LegacyTransform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  matrix?: number[];
}

/**
 * Legacy ScreenShake interface for compatibility.
 * @deprecated Use ScreenShakeComponent instead.
 */
export interface LegacyScreenShake {
  intensity: number;
  duration: number;
  remaining: number;
}

