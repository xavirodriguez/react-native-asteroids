import { Component } from "../core/Component";

/**
 * @deprecated Utilizar {@link TransformComponent} en su lugar para soporte de jerarquía y rotación.
 */
export interface PositionComponent extends Component {
  type: "Position";
  /** Coordenada X en píxeles. */
  x: number;
  /** Coordenada Y en píxeles. */
  y: number;
}

/**
 * @deprecated Use Collider2DComponent instead for multi-shape support
 */
export interface ColliderComponent extends Component {
  type: "Collider";
  radius: number;
}

/**
 * Renderable component for compatibility.
 * @deprecated Use RenderComponent instead.
 */
export interface RenderableComponent extends Component {
  type: "Renderable";
  shape: string;
  visible: boolean;
  textureId?: string;
  width: number;
  height: number;
  color: string;
  /** @deprecated Use zIndex in RenderComponent instead */
  zOrder: number;
  opacity?: number;
  renderType?: string;
  size?: number | { width: number; height: number };
  radius?: number;
}

/**
 * Legacy Transform interface for compatibility.
 * @deprecated Use TransformComponent instead.
 */
export interface Transform {
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
export interface ScreenShake {
  intensity: number;
  duration: number;
  remaining: number;
}

export interface CollisionManifold {
  colliding: boolean;
  normalX: number;
  normalY: number;
  depth: number;
  contactPoints: Array<{ x: number; y: number }>;
  entityA?: number; // Using number for Entity to avoid circular dep
  entityB?: number;
}
