import { Component, GenericComponent } from "./Component";
import { Entity } from "./Entity";
import { EventBus } from "./EventBus";
import { StateMachine } from "./StateMachine";
import type { World } from "./World";
import type { CollisionManifold } from "../physics/collision/CollisionTypes";
import { AABB } from "../types/CommonTypes";
export { Entity, Component, GenericComponent };

/**
 * Standard base components provided by the engine.
 *
 * This module defines the core data structures used by built-in systems for
 * physics, rendering, lifecycle, and AI. Components should remain pure POJOs
 * (Plain Old JavaScript Objects) to facilitate serialization and snapshots.
 *
 * @packageDocumentation
 */

/**
 * Stores the position, rotation, and scale of an entity in 2D space.
 */
export interface TransformComponent extends Component {
  type: "Transform";
  [key: string]: unknown; // Para compatibilidad con utilidades que no usan index signatures
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;

  parent?: Entity;
  dirty?: boolean;

  worldX?: number;
  worldY?: number;
  worldRotation?: number;
  worldScaleX?: number;
  worldScaleY?: number;
}

/**
 * Indica que una entidad gestiona su propia integración física.
 */
export interface ManualMovementComponent extends Component {
  type: "ManualMovement";
}

/**
 * Stores the transform state from the previous simulation tick.
 * Used primarily for visual interpolation in renderers.
 */
export interface PreviousTransformComponent extends Component {
  type: "PreviousTransform";
  [key: string]: unknown;
  x: number;
  y: number;
  rotation: number;

  worldX?: number;
  worldY?: number;
  worldRotation?: number;
}

/**
 * Defines the movement vector and angular velocity.
 * Units: pixels/second for dx/dy, radians/second for vAngle.
 */
export interface VelocityComponent extends Component {
  type: "Velocity";
  [key: string]: unknown;
  dx: number;
  dy: number;
  vAngle?: number;
}

/**
 * Aplica una fuerza de rozamiento.
 */
export interface FrictionComponent extends Component {
  type: "Friction";
  value: number;
}

/**
 * Defines spatial limits for an entity and its behavior when crossing them.
 */
export interface BoundaryComponent extends Component {
  type: "Boundary";
  x?: number;
  y?: number;
  width: number;
  height: number;
  behavior: "wrap" | "bounce" | "destroy";
  bounceX?: boolean;
  bounceY?: boolean;
}

/**
 * Permite añadir etiquetas semánticas.
 */
export interface TagComponent extends Component {
  type: "Tag";
  tags: string[];
}

/**
 * Time To Live (TTL) component.
 * Automatically handles entity destruction after a duration.
 */
export interface TTLComponent extends Component {
  type: "TTL";
  remaining: number;
  total: number;
  onComplete?: () => void;
}

import { Shape } from "../physics/shapes/ShapeTypes";

/**
 * Modern 2D collision component.
 * Defines the shape and physical properties for collision detection.
 */
export interface Collider2DComponent extends Component {
  type: "Collider2D";
  shape: Shape;
  offsetX: number;
  offsetY: number;
  layer: number;
  mask: number;
  isTrigger: boolean;
  enabled: boolean;
}

/**
 * Component that tracks collision events.
 */
export interface CollisionEvent {
  otherEntity: Entity;
  manifold?: CollisionManifold;
  normalX?: number;
  normalY?: number;
  depth?: number;
  contactPoints?: Array<{ x: number; y: number }>;
}

export interface CollisionEventsComponent extends Component {
  type: "CollisionEvents";
  collisions: CollisionEvent[];
  activeTriggers: Entity[];
  triggersEntered: Entity[];
  triggersExited: Entity[];
}

export { CollisionManifold };

/**
 * Habilita la detección de colisiones continuas (CCD).
 */
export interface ContinuousColliderComponent extends Component {
  type: "ContinuousCollider";
  enabled: boolean;
  velocityThreshold?: number;
}

/**
 * Rigid body properties for full physics simulation.
 * Use this when an entity requires mass, forces, and advanced friction.
 *
 * @remarks
 * For simple movement without complex dynamics, prefer {@link VelocityComponent}.
 */
export interface PhysicsBody2DComponent extends Component {
  type: "PhysicsBody2D";
  [key: string]: unknown;
  /**
   * static: immovable, zero mass.
   * dynamic: fully simulated, affected by forces and gravity.
   * kinematic: moved via velocity, not affected by forces.
   */
  bodyType: "static" | "dynamic" | "kinematic";
  velocityX: number;
  velocityY: number;
  angularVelocity: number;
  /** Accumulated force X to be applied in the next tick. */
  forceX: number;
  /** Accumulated force Y to be applied in the next tick. */
  forceY: number;
  /** Accumulated torque to be applied in the next tick. */
  torque: number;
  mass: number;
  /** Pre-calculated 1/mass. Use 0 for infinite mass (static). */
  readonly inverseMass: number;
  /** Rotational resistance. */
  inertia: number;
  /** Pre-calculated 1/inertia. */
  readonly inverseInertia: number;
  /** Bounciness [0, 1]. */
  restitution: number;
  staticFriction: number;
  dynamicFriction: number;
  /** Multiplier for global gravity. */
  gravityScale: number;
  /** If true, the entity will not rotate due to torque or collisions. */
  fixedRotation: boolean;
}

/**
 * Defines the visual appearance of an entity.
 */
export interface RenderComponent extends Component {
  type: "Render";
  /** Identifier for the shape drawer (e.g., "circle", "triangle", "ufo"). */
  shape: string;
  /** Primary dimension (radius or width). */
  size: number;
  /** Hex or CSS color string. */
  color: string;
  /** Current cosmetic rotation in radians. */
  rotation: number;
  /** Rotational speed for cosmetic effects. */
  angularVelocity?: number;
  /** Optional custom vertices for polygon shapes. */
  vertices?: { x: number; y: number }[];
  /** Rendering order. Higher values are drawn on top. */
  zIndex?: number;
  /** Number of frames to display a white overlay (hit effect). */
  hitFlashFrames?: number;
  /** Arbitrary data for game-specific drawers. */
  data?: Record<string, unknown>;
}

/**
 * Manages life points and invulnerability state.
 */
export interface HealthComponent extends Component {
  type: "Health";
  /** Current HP. */
  current: number;
  /** Maximum HP. */
  max: number;
  /** Remaining invulnerability time in milliseconds. */
  invulnerableRemaining: number;
}

/**
 * Marks an entity for return to an object pool.
 */
export interface ReclaimableComponent extends Component {
  type: "Reclaimable";
  /** Callback triggered when the entity is removed from the world. */
  onReclaim: (world: World, entity: Entity) => void;
}

export type InputAction = string;

/**
 * Singleton resource component that consolidates current input state.
 */
export interface InputStateComponent extends Component {
  type: "InputState";
  /** Map of action names to their pressed state. */
  actions: Map<InputAction, boolean>;
  /** Map of axis names to their continuous values [-1, 1]. */
  axes: Map<string, number>;
}

/**
 * Singleton resource component providing access to the EventBus.
 */
export interface EventBusComponent extends Component {
  type: "EventBus";
  bus: EventBus;
}

/**
 * Configuration for an animation.
 */
export interface AnimationConfig {
  fps: number;
  frames: number[] | string[];
  loop: boolean;
  onComplete?: (entity: Entity) => void;
}

/**
 * Manages frame-based sprite or property animations.
 */
export interface AnimatorComponent extends Component {
  type: "Animator";
  /** Dictionary of animation configurations. */
  animations: Record<string, AnimationConfig>;
  /** Name of the currently playing animation. */
  current: string;
  /** Current frame index. */
  frame: number;
  /** Time elapsed in the current frame (ms). */
  elapsed: number;
}

/**
 * Attaches a Finite State Machine (FSM) to an entity.
 */
export interface StateMachineComponent extends Component {
  type: "StateMachine";
  /** The FSM instance managing the entity's logic state. */
  fsm: StateMachine<string, unknown>;
}

/**
 * Configuration for a particle emitter.
 */
export interface ParticleEmitterConfig {
  burst?: number;
  rate: number;
  loop: boolean;
  angle: { min: number; max: number };
  speed: { min: number; max: number };
  lifetime: { min: number; max: number };
  size: { min: number; max: number };
  color: string[];
  position?: { x: number; y: number };
}

/**
 * Logic for spawning particles over time or in bursts.
 */
export interface ParticleEmitterComponent extends Component {
  type: "ParticleEmitter";
  config: ParticleEmitterConfig;
  /** If false, the emitter stops spawning new particles. */
  active: boolean;
  /** Time since last emission (ms). */
  elapsed: number;
}

/**
 * Configuration for a tileset.
 */
export interface TilesetConfig {
  id: number;
  solid: boolean;
}

/**
 * Represents a layer in a tilemap.
 */
export interface TilemapLayer {
  tiles: number[];
  collidable: boolean;
}

/**
 * Data structure for a tilemap.
 */
export interface TilemapData {
  width: number;
  height: number;
  tileSize: number;
  layers: TilemapLayer[];
  tilesets: TilesetConfig[];
}

/**
 * Represents the visible range of a tilemap.
 */
export interface TilemapVisibleRange {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

/**
 * Stores data for a grid-based tile map.
 */
export interface TilemapComponent extends Component {
  type: "Tilemap";
  data: TilemapData;
  /** Internal cache for the visible portion of the map (culling). */
  _visibleRange?: TilemapVisibleRange;
}

/**
 * Configuration for a 2D camera viewport.
 * Defines what area of the world is visible and how it follows targets.
 */
export interface Camera2DComponent extends Component {
  type: "Camera2D";
  /** World X coordinate of the camera center. */
  x: number;
  /** World Y coordinate of the camera center. */
  y: number;
  zoom: number;
  /** Current screen shake magnitude. */
  shakeIntensity: number;
  /** Visual offset X applied by screen shake. */
  shakeOffsetX: number;
  /** Visual offset Y applied by screen shake. */
  shakeOffsetY: number;
  /** Interpolation factor for smooth following [0, 1]. */
  smoothing: number;
  /** Viewport-relative center offset. */
  offset: { x: number; y: number };
  /** Spatial limits for camera movement. */
  bounds: AABB | null;
  /** Inner region where targets can move without shifting the camera. */
  deadzone: AABB | null;
  /** List of entities for average-position tracking. */
  targets: Entity[];
  /** Primary entity the camera should focus on. */
  targetEntity?: Entity;
  /** If true, this camera is used as the primary viewport for culling and rendering. */
  isMain?: boolean;
}

/**
 * Individual screen shake effect. Intensities are aggregated by the renderer.
 */
export interface ScreenShakeComponent extends Component {
  type: "ScreenShake";
  /** Maximum pixel offset. */
  intensity: number;
  /** Total effect duration (ms). */
  duration: number;
  /** Time left until expiration (ms). */
  remaining: number;
  config?: unknown;
}

/**
 * Temporary visual offset applied during rendering.
 * Used for juice effects or network error smoothing without affecting simulation.
 */
export interface VisualOffsetComponent extends Component {
  type: "VisualOffset";
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

/**
 * Stores historical positions for drawing trailing effects.
 */
export interface TrailComponent extends Component {
  type: "Trail";
  /** Circular buffer of points. */
  points: { x: number; y: number }[];
  /** Index of the head point. */
  currentIndex: number;
  /** Number of valid points in the buffer. */
  count: number;
  /** Capacity of the buffer. */
  maxLength: number;
}

export interface Star extends Component {
  type: "Star";
  x: number;
  y: number;
  size: number;
  alpha: number;
  brightness: number;
  twinklePhase: number;
  twinkleSpeed: number;
  layer: number;
}

/**
 * Represents a discrete modifier (buff/debuff) applied to an entity.
 */
export interface Modifier {
  /** Unique ID for stacking logic. */
  id: string;
  /** Type of effect (e.g., "speed", "triple_shot"). */
  type: string;
  /** Numerical value associated with the modifier. */
  value: number;
  /** Initial duration in milliseconds. */
  duration: number;
  /** Time left before expiration in milliseconds. */
  remaining: number;
}

/**
 * Component that holds a stack of active modifiers (Status Effects).
 */
export interface ModifierStackComponent extends Component {
  type: "ModifierStack";
  /** List of currently active buffs or debuffs. */
  modifiers: Modifier[];
}

/**
 * Define probabilities for dropping loot when an entity is destroyed.
 */
export interface LootTableComponent extends Component {
  type: "LootTable";
  drops: Array<{
    type: string;
    chance: number;
    config?: Record<string, unknown>;
  }>;
}

/**
 * Represents a collectible item in the world.
 */
export interface PowerUpComponent extends Component {
  type: "PowerUp";
  /** Discriminator for the effect (e.g., "triple_shot"). */
  powerUpType: string;
  /** Magnitude of the effect. */
  value: number;
  /** Duration applied to the collector (ms). */
  duration: number;
}

/**
 * Tracks entity occupancy in the global SpatialGrid.
 * Used for broadphase collision and simulation culling (USSC).
 */
export interface SpatialNodeComponent extends Component {
  type: "SpatialNode";
  lastCellKeys: string[];
  active: boolean;
  isStatic?: boolean;
}

/**
 * Unión de todos los componentes base del motor para endurecimiento de tipos.
 */
export type AnyCoreComponent =
  | TransformComponent
  | ManualMovementComponent
  | PreviousTransformComponent
  | VelocityComponent
  | FrictionComponent
  | BoundaryComponent
  | TagComponent
  | TTLComponent
  | Collider2DComponent
  | CollisionEventsComponent
  | ContinuousColliderComponent
  | PhysicsBody2DComponent
  | RenderComponent
  | HealthComponent
  | ReclaimableComponent
  | InputStateComponent
  | EventBusComponent
  | AnimatorComponent
  | StateMachineComponent
  | ParticleEmitterComponent
  | TilemapComponent
  | Camera2DComponent
  | ScreenShakeComponent
  | VisualOffsetComponent
  | TrailComponent
  | Star
  | ModifierStackComponent
  | LootTableComponent
  | PowerUpComponent
  | SpatialNodeComponent;

/**
 * Auxiliar para inferir el tipo concreto de un componente a partir de su discriminador.
 */
export type ComponentOf<TType extends AnyCoreComponent["type"]> = Extract<AnyCoreComponent, { type: TType }>;
