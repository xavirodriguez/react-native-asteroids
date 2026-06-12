import { Component, ComponentRegistry, ComponentType, ComponentOf, DeepReadonly } from "./Component";
import { Entity } from "./Entity";
import { EventRegistry, EventBus as GenericEventBus } from "../events/EventBus";
import { AABB, ScreenConfig } from "../math/CommonTypes";
import { Shape } from "../physics/shapes/ShapeTypes";
import { CollisionManifold } from "../physics/collision/CollisionTypes";
import { JoystickConfig, JoystickType } from "../input/JoystickTypes";
import { WorldSnapshot, ComponentDataSnapshot, SerializedComponent } from "./SnapshotTypes";

export { 
  Entity, AABB, Shape, CollisionManifold, Component, ComponentRegistry, 
  ComponentType, ComponentOf, DeepReadonly, WorldSnapshot, 
  ComponentDataSnapshot, SerializedComponent, ScreenConfig
};


/**
 * Common interface for components that participate in a parent-child hierarchy.
 */
export interface IHierarchicalComponent extends Component {
  /** Reference to the parent entity, or null if it's a root element. */
  parentEntity: Entity | null;
  /** Optimization flag to indicate that the hierarchy or local transform needs re-evaluation. */
  dirty?: boolean;
}

/**
 * Basic tag component for identification.
 */
export interface TagComponent extends Component {
  type: "Tag";
  tags: string[];
}


/**
 * Standard 2D transform.
 */
export interface TransformComponent extends IHierarchicalComponent {
  type: "Transform";
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;

  worldX?: number;
  worldY?: number;
  worldRotation?: number;
  worldScaleX?: number;
  worldScaleY?: number;
}

/**
 * Intended to store the transform from the previous simulation tick for interpolation.
 */
export interface PreviousTransformComponent extends Component {
  type: "PreviousTransform";
  x: number;
  y: number;
  rotation: number;

  worldX?: number;
  worldY?: number;
  worldRotation?: number;
}

/**
 * 2D linear velocity.
 */
export interface VelocityComponent extends Component {
  type: "Velocity";
  /** [px/s] velocity X. */
  dx: number;
  /** [px/s] velocity Y. */
  dy: number;
  /** [rad/s] angular velocity. */
  vAngle?: number;
}

/**
 * Basic friction/damping factor.
 */
export interface FrictionComponent extends Component {
  type: "Friction";
  value: number;
}

/**
 * World boundary constraints.
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
 * Time To Live - used by systems to manage automatic entity destruction.
 */
export interface TTLComponent extends Component {
  type: "TTL";
  remaining: number;
  total: number;
  onCompleteEvent?: string;
}

/**
 * Modern 2D collision component.
 */
export interface Collider2DComponent extends Component {
  type: "Collider2D";
  shape: Shape;
  /** [px] horizontal offset relative to Transform. */
  offsetX: number;
  /** [px] vertical offset relative to Transform. */
  offsetY: number;
  layer: number;
  mask: number;
  isTrigger: boolean;
  enabled: boolean;
}

/**
 * Continuous Collision Detection configuration.
 */
export interface ContinuousColliderComponent extends Component {
  type: "ContinuousCollider";
  enabled: boolean;
  /** [px/s] Minimum velocity to trigger CCD. If not provided, it's calculated based on size. */
  velocityThreshold?: number;
  /**
   * Detection mode:
   * - raycast: ideal for bullets (segment from previous to current pos).
   * - swept: ideal for circles/AABBs (swept volume).
   * - substep: divides the frame into micro-steps (more expensive but precise).
   */
  mode?: "raycast" | "swept" | "substep";
  /** Limit of micro-steps for 'substep' mode. */
  maxSubSteps?: number;
  /** Additional padding for the swept volume. */
  radiusPadding?: number;
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
  contactPoints?: ReadonlyArray<{ readonly x: number; readonly y: number }>;
}

/**
 * Intended to store collision events detected during the current simulation tick.
 */
export interface CollisionEventsComponent extends Component {
  type: "CollisionEvents";
  collisions: CollisionEvent[];
  activeTriggers: Entity[];
  triggersEntered: Entity[];
  triggersExited: Entity[];
}

/**
 * Basic physics body properties.
 */
export interface PhysicsBody2DComponent extends Component {
  type: "PhysicsBody2D";
  /**
   * static: immovable, zero mass.
   * dynamic: fully simulated, affected by forces and gravity.
   * kinematic: moved via velocity, not affected by forces.
   */
  bodyType: "static" | "dynamic" | "kinematic";
  /** [px/s] Linear velocity X. */
  velocityX: number;
  /** [px/s] Linear velocity Y. */
  velocityY: number;
  /** [rad/s] Angular velocity. */
  angularVelocity: number;
  /** [px/s^2] Force X. */
  forceX: number;
  /** [px/s^2] Force Y. */
  forceY: number;
  /** [rad/s^2] Torque. */
  torque: number;
  /** [kg] Mass. */
  mass: number;
  /** Pre-calculated 1/mass. Use 0 for infinite mass (static). */
  readonly inverseMass: number;
  /** Rotational resistance. */
  inertia: number;
  /** Pre-calculated 1/inertia. */
  readonly inverseInertia: number;
  /** [unitless] Bounciness [0, 1]. */
  restitution: number;
  /** [unitless] Static friction coefficient. */
  staticFriction: number;
  /** [unitless] Dynamic friction coefficient. */
  dynamicFriction: number;
  /** [unitless] Multiplier for global gravity. */
  gravityScale: number;
  /** If true, the entity will not rotate due to torque or collisions. */
  fixedRotation: boolean;
}

/**
 * Visual rendering properties.
 */
export interface RenderComponent extends Component {
  type: "Render";
  visible: boolean;
  opacity: number;
  color?: string;
  shape: string;
  size: number;
  rotation: number;
  zIndex?: number;
  angularVelocity?: number;
  hitFlashFrames?: number;
}

/**
 * Basic health/life tracking.
 */
export interface HealthComponent extends Component {
  type: "Health";
  current: number;
  max: number;
}

/**
 * Standard Player component for multiplayer.
 */
export interface PlayerComponent extends Component {
  type: "Player";
  sessionId?: string;
  score: number;
}

/**
 * Logical input actions.
 */
export type InputAction = string;

/**
 * Generic input state for an entity.
 */
export interface InputStateComponent extends Component {
  type: "InputState";
  axes: Map<string, number>;
  buttons: Map<string, boolean>;
  actions: Map<InputAction, boolean>;
}

/**
 * Global or local EventBus reference.
 */
export interface EventBusComponent<T extends EventRegistry = EventRegistry> extends Component {
  type: "EventBus";
  bus: GenericEventBus<T>;
}

/**
 * Generic frame-based animator.
 */
export interface AnimatorComponent extends Component {
  type: "Animator";
  animations: Record<string, {
    frames: number[];
    frameRate: number;
    loop?: boolean;
    onCompleteEvent?: string;
  }>;
  current?: string;
  frame: number;
  elapsed: number;
}

/**
 * Finite State Machine component.
 */
export interface StateMachineComponent extends Component {
  type: "StateMachine";
  machineId: string;
  states: Record<string, any>;
  currentState: string;
  previousState?: string;
  elapsedMs: number;
  data: Record<string, any>;
}

/**
 * Range for random values.
 */
export interface Range {
  min: number;
  max: number;
}

/**
 * Detailed configuration for a particle emitter.
 */
export interface ParticleEmitterConfig {
  rate: number;
  burst?: number;
  loop?: boolean;
  angle: Range;
  speed: Range;
  lifetime: Range;
  size: Range;
  color: readonly string[];
  position?: { x: number; y: number };
}

/**
 * Visual particle emitter.
 */
export interface ParticleEmitterComponent extends Component {
  type: "ParticleEmitter";
  config: ParticleEmitterConfig;
  active: boolean;
  elapsed: number;
}

/**
 * Grid-based tilemap data structure.
 */
export interface TilemapData {
  width: number;
  height: number;
  tileSize: number;
  tiles: number[];
}



/**
 * Grid-based tilemap data structure.
 */
export interface TilemapData {
  width: number;
  height: number;
  tileSize: number;
  tiles: number[];
}

/**
 * Grid-based tilemap component.
 */
export interface TilemapComponent extends Component {
  type: "Tilemap";
  data: TilemapData;
  visibleRange?: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

/**
 * 2D Camera settings.
 */
export interface Camera2DComponent extends Component {
  type: "Camera2D";
  x: number;
  y: number;
  zoom: number;
  target?: Entity;
  targetEntity?: Entity;
  targets?: ReadonlyArray<Entity>;
  offset: { x: number; y: number };
  deadzone: { minX: number; minY: number; maxX: number; maxY: number };
  smoothing: number;
  bounds?: { minX: number; minY: number; maxX: number; maxY: number };
  shakeIntensity: number;
  shakeOffsetX: number;
  shakeOffsetY: number;
  isMain?: boolean;
}

/**
 * Screen shake effect parameters.
 */
export interface ScreenShakeComponent extends Component {
  type: "ScreenShake";
  intensity: number;
  duration: number;
  remaining: number;
}

/**
 * Visual offset from the physics/transform position.
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
 * Single Juice animation configuration.
 */
export interface JuiceAnimation {
  property: "scaleX" | "scaleY" | "rotation" | "x" | "y" | "opacity";
  target: number;
  duration: number;
  delay?: number;
  easing?: "linear" | "easeIn" | "easeOut" | "easeInOut" | "elasticOut";
  repeat?: number;
  yoyo?: boolean;
  onCompleteEvent?: string;
  elapsed: number;
  startValue?: number;
}

/**
 * Procedural animation component.
 */
export interface JuiceComponent extends Component {
  type: "Juice";
  animations: JuiceAnimation[];
}

/**
 * Visual trail/breadcrumb tracking.
 */
export interface TrailComponent extends Component {
  type: "Trail";
  points: { x: number, y: number }[];
  maxLength: number;
  currentIndex: number;
  count: number;
}

/**
 * Spatial partitioning node reference.
 */
export interface SpatialNodeComponent extends Component {
  type: "SpatialNode";
  active: boolean;
  lastCellKeys: string[];
}

/**
 * Component for requesting haptic feedback.
 */
export interface HapticRequestComponent<TPattern extends string = string> extends Component {
  type: "HapticRequest";
  pattern: TPattern;
  intensity?: number;
}

export interface ReclaimableComponent extends Component {
  type: "Reclaimable";
  poolId: string;
  onReclaim?: (world: any, entity: Entity) => void;
}

/**
 * Component representing a virtual joystick input device.
 */
export interface VirtualJoystickComponent extends Component {
  type: "VirtualJoystick";
  /** If the joystick is currently being touched. */
  active: boolean;
  /** [px] Origin X coordinate (where the touch started). */
  originX: number;
  /** [px] Origin Y coordinate (where the touch started). */
  originY: number;
  /** [px] Current X coordinate of the touch. */
  currentX: number;
  /** [px] Current Y coordinate of the touch. */
  currentY: number;
  /** [px] Maximum displacement radius. */
  radius: number;

  /** Joystick configuration (deadzone, curve, etc). */
  config?: JoystickConfig;
  /** Semantic type for automatic command generation. */
  joystickType?: JoystickType;

  /** Name of the horizontal axis to update in InputState. */
  horizontalAxis: string;
  /** Name of the vertical axis to update in InputState. */
  verticalAxis: string;

  /** [unitless] Normalized deadzone radius [0, 1]. @deprecated Use config.deadzone */
  deadzone?: number;
  /** [unitless] Input sensitivity multiplier. @deprecated Use config.sensitivity */
  sensitivity?: number;
  /** Response curve algorithm. @deprecated Use config.curveType */
  curveType?: "linear" | "quadratic" | "squared";
  /** @internal Track deadzone state for haptics. */
  _wasInDeadzone?: boolean;
}

/**
 * Stores the processed, ready-to-use joystick values.
 */
export interface ProcessedJoystickComponent extends Component {
  type: "ProcessedJoystick";
  /** [unitless] Normalized X value [-1, 1]. */
  x: number;
  /** [unitless] Normalized Y value [-1, 1]. */
  y: number;
  /** [unitless] Current magnitude [0, 1]. */
  magnitude: number;
  /** If the input is currently inside the deadzone. */
  inDeadzone: boolean;
}

/**
 * Command Pattern: Intent to move an entity.
 */
export interface MoveCommand extends Component {
  type: "MoveCommand";
  /** [unitless] Normalized movement vector X [-1, 1]. */
  x: number;
  /** [unitless] Normalized movement vector Y [-1, 1]. */
  y: number;
}

/**
 * Command Pattern: Intent to rotate an entity.
 */
export interface RotateCommand extends Component {
  type: "RotateCommand";
  /** [unitless] Normalized rotation amount [-1, 1]. */
  amount: number;
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
 * Specifically tracks a object in games like Pong.
 */
export interface ObjectEffectComponent extends Component {
  type: "ObjectEffect";
  /** [unitless] Current spin applied to the object. */
  spinFactor: number;
  /** [unitless] Rate at which spin decreases per frame. */
  spinDecay: number;
  /** [ticks] Time remaining for visibility effects. */
  visibilityTimer?: number;
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
 * Interface for entity pools.
 */
export interface IEntityPool {
  release(world: any, entity: Entity): void;
}

/**
 * The standard set of components provided by the core engine.
 */
export interface CoreComponentRegistry extends ComponentRegistry {
  Transform: TransformComponent;
  PreviousTransform: PreviousTransformComponent;
  Velocity: VelocityComponent;
  Friction: FrictionComponent;
  Boundary: BoundaryComponent;
  Tag: TagComponent;
  TTL: TTLComponent;
  Collider2D: Collider2DComponent;
  ContinuousCollider: ContinuousColliderComponent;
  CollisionEvents: CollisionEventsComponent;
  PhysicsBody2D: PhysicsBody2DComponent;
  Render: RenderComponent;
  Health: HealthComponent;
  Player: PlayerComponent;
  InputState: InputStateComponent;
  EventBus: EventBusComponent<EventRegistry>;
  Animator: AnimatorComponent;
  StateMachine: StateMachineComponent;
  ParticleEmitter: ParticleEmitterComponent;
  Tilemap: TilemapComponent;
  Camera2D: Camera2DComponent;
  ScreenShake: ScreenShakeComponent;
  VisualOffset: VisualOffsetComponent;
  Juice: JuiceComponent;
  Trail: TrailComponent;
  SpatialNode: SpatialNodeComponent;
  HapticRequest: HapticRequestComponent<string>;
  Reclaimable: ReclaimableComponent;
  VirtualJoystick: VirtualJoystickComponent;
  ProcessedJoystick: ProcessedJoystickComponent;
  MoveCommand: MoveCommand;
  RotateCommand: RotateCommand;
  ModifierStack: ModifierStackComponent;
  LootTable: LootTableComponent;
  ObjectEffect: ObjectEffectComponent;
  PowerUp: PowerUpComponent;
}
