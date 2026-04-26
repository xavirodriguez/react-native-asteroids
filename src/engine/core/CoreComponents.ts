import { Component, GenericComponent } from "./Component";
import { Entity } from "./Entity";
import { EventBus } from "./EventBus";
import { StateMachine } from "./StateMachine";
import type { World } from "./World";
import type { CollisionManifold } from "../physics/collision/CollisionTypes";
import { AABB } from "../types/CommonTypes";
export { Entity, Component, GenericComponent };

/**
 * Componentes base proporcionados por el motor como primitivas reutilizables.
 */

/**
 * Almacena la posición, rotación y escala de una entidad.
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
 * Almacena el estado de la transformación en el frame anterior.
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
 * Define el vector de movimiento y la velocidad angular.
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
 * Define los límites espaciales.
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
 * Time To Live.
 */
export interface TTLComponent extends Component {
  type: "TTL";
  remaining: number;
  total: number;
  onComplete?: () => void;
}

import { Shape } from "../physics/shapes/ShapeTypes";

/**
 * Componente de colisión moderno.
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
 * Componente de cuerpo rígido.
 */
export interface PhysicsBody2DComponent extends Component {
  type: "PhysicsBody2D";
  [key: string]: unknown;
  bodyType: "static" | "dynamic" | "kinematic";
  velocityX: number;
  velocityY: number;
  angularVelocity: number;
  forceX: number;
  forceY: number;
  torque: number;
  mass: number;
  readonly inverseMass: number;
  inertia: number;
  readonly inverseInertia: number;
  restitution: number;
  staticFriction: number;
  dynamicFriction: number;
  gravityScale: number;
  fixedRotation: boolean;
}

/**
 * Define la apariencia.
 */
export interface RenderComponent extends Component {
  type: "Render";
  shape: string;
  size: number;
  color: string;
  rotation: number;
  angularVelocity?: number;
  vertices?: { x: number; y: number }[];
  zIndex?: number;
  hitFlashFrames?: number;
  data?: Record<string, unknown>;
}

/**
 * Gestiona la salud.
 */
export interface HealthComponent extends Component {
  type: "Health";
  current: number;
  max: number;
  invulnerableRemaining: number;
}

/**
 * Marca una entidad para ser reciclada.
 */
export interface ReclaimableComponent extends Component {
  type: "Reclaimable";
  onReclaim: (world: World, entity: Entity) => void;
}

export type InputAction = string;

/**
 * Componente singleton que consolida el estado de todas las entradas.
 */
export interface InputStateComponent extends Component {
  type: "InputState";
  actions: Map<InputAction, boolean>;
  axes: Map<string, number>;
}

/**
 * Event bus singleton component.
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

export interface AnimatorComponent extends Component {
  type: "Animator";
  animations: Record<string, AnimationConfig>;
  current: string;
  frame: number;
  elapsed: number;
}

export interface StateMachineComponent extends Component {
  type: "StateMachine";
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

export interface ParticleEmitterComponent extends Component {
  type: "ParticleEmitter";
  config: ParticleEmitterConfig;
  active: boolean;
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

export interface TilemapComponent extends Component {
  type: "Tilemap";
  data: TilemapData;
  _visibleRange?: TilemapVisibleRange;
}

export interface Camera2DComponent extends Component {
  type: "Camera2D";
  x: number;
  y: number;
  zoom: number;
  shakeIntensity: number;
  shakeOffsetX: number;
  shakeOffsetY: number;
  smoothing: number;
  offset: { x: number; y: number };
  bounds: AABB | null;
  deadzone: AABB | null;
  targets: Entity[];
  targetEntity?: Entity;
  isMain?: boolean;
}

export interface ScreenShakeComponent extends Component {
  type: "ScreenShake";
  intensity: number;
  duration: number;
  remaining: number;
  config?: unknown;
}

export interface VisualOffsetComponent extends Component {
  type: "VisualOffset";
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

export interface TrailComponent extends Component {
  type: "Trail";
  points: { x: number; y: number }[];
  currentIndex: number;
  count: number;
  maxLength: number;
}

export interface Modifier {
  id: string;
  targetProp: string;
  multiplier: number;
  duration: number; // in milliseconds
}

/**
 * Stores a stack of active modifiers (status effects) for an entity.
 */
export interface ModifierStackComponent extends Component {
  type: "ModifierStack";
  active: Modifier[];
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
 * Represents a discrete modifier applied to an entity.
 */
export interface Modifier {
  id: string;
  type: string;
  value: number;
  duration: number; // in milliseconds
  remaining: number;
}

/**
 * Component that holds a stack of active modifiers (Status Effects).
 */
export interface ModifierStackComponent extends Component {
  type: "ModifierStack";
  modifiers: Modifier[];
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
  | ModifierStackComponent;

/**
 * Auxiliar para inferir el tipo concreto de un componente a partir de su discriminador.
 */
export type ComponentOf<TType extends AnyCoreComponent["type"]> = Extract<AnyCoreComponent, { type: TType }>;
