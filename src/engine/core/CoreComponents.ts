import { Component } from "./Component";
import { Entity } from "./Entity";

/**
 * Components provided by the engine as reusable primitives.
 */

export interface PositionComponent extends Component {
  type: "Position";
  x: number;
  y: number;
}

export interface VelocityComponent extends Component {
  type: "Velocity";
  dx: number;
  dy: number;
}

export interface TTLComponent extends Component {
  type: "TTL";
  remaining: number;
  total: number;
}

export interface ColliderComponent extends Component {
  type: "Collider";
  radius: number;
}

export interface RenderComponent extends Component {
  type: "Render";
  shape: string;
  size: number;
  color: string;
  rotation: number;
  angularVelocity?: number;
  vertices?: { x: number; y: number }[];
  /** Custom data for game-specific drawers */
  data?: Record<string, any>;
}

/**
 * Tracks the health or durability of an entity.
 */
export interface HealthComponent extends Component {
  type: "Health";
  current: number;
  max: number;
  invulnerableRemaining: number;
}

/**
 * Reclaimable component for entities that should be returned to a pool.
 */
export interface ReclaimableComponent extends Component {
  type: "Reclaimable";
  onReclaim: (world: any, entity: any) => void;
}
