import { Component, Entity } from "../../types/EngineTypes";

/**
 * Base transform for all game entities.
 */
export interface TransformComponent extends Component {
  type: "Transform";
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

/**
 * Metadata for identifying entities and their collision profiles.
 */
export interface TagComponent extends Component {
  type: "Tag";
  tags: string[];
}

/**
 * Configuration for Matter.js rigid body adapter.
 */
export interface RigidBodyComponent extends Component {
  type: "RigidBody";
  bodyId: number | string; // Reference to Matter.Body.id
  isStatic: boolean;
  isSensor: boolean;
  restitution: number;
  friction: number;
  density: number;
  collisionFilter: {
    group: number;
    category: number;
    mask: number;
  };
}

/**
 * Unified renderable descriptor for Skia.
 */
export type RenderType = "circle" | "rect" | "sprite" | "atlas" | "text" | "path" | "particle";

export interface RenderableComponent extends Component {
  type: "Renderable";
  renderType: RenderType;
  color: string;
  opacity: number;
  visible: boolean;
  zIndex: number;
  size: { width: number; height: number; radius?: number };
  spriteKey?: string; // For atlas or simple image lookup
  text?: string;
  pathData?: string;
}
