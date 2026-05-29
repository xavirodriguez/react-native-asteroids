import { Entity } from "../core/Entity";
import { World } from "../core/World";

export * from "../core/Component";
export * from "../core/Entity";
export {
  IHierarchicalComponent,
  JuiceAnimation,
  JuiceComponent,
  TransformComponent,
  ManualMovementComponent,
  EnemyTagComponent,
  AsteroidComponent,
  InvaderComponent,
  BulletComponent,
  ShipComponent,
  PreviousTransformComponent,
  VelocityComponent,
  FrictionComponent,
  BoundaryComponent,
  TagComponent,
  TTLComponent,
  Collider2DComponent,
  CollisionEvent,
  CollisionEventsComponent,
  ContinuousColliderComponent,
  PhysicsBody2DComponent,
  RenderComponent,
  HealthComponent,
  ReclaimableComponent,
  InputAction,
  InputStateComponent,
  EventBusComponent,
  AnimationConfig,
  AnimatorComponent,
  StateMachineComponent,
  ParticleEmitterConfig,
  ParticleEmitterComponent,
  TilesetConfig,
  TilemapLayer,
  TilemapData,
  TilemapVisibleRange,
  TilemapComponent,
  Camera2DComponent,
  ScreenShakeComponent,
  VisualOffsetComponent,
  TrailComponent,
  Star,
  Modifier,
  ModifierStackComponent,
  LootTableComponent,
  PowerUpComponent,
  BallComponent,
  SpatialNodeComponent,
  HapticRequestComponent,
  VirtualJoystickComponent,
  ProcessedJoystickComponent,
  MoveCommand,
  RotateCommand,
  CoreComponentRegistry,
  AnyCoreComponent
} from "../core/CoreComponents";
export * from "../physics/shapes/ShapeTypes";
export * from "./CommonTypes";
export { CollisionManifold } from "../physics/collision/CollisionTypes";

/**
 * Represents a serialized component, intended to contain only flat, serializable data.
 */
export type SerializedComponent = Record<string, unknown>;

/**
 * Represents a map of component types to their respective entity-component data.
 */
export type ComponentDataSnapshot = Record<string, Record<Entity, SerializedComponent>>;

/**
 * Represents a snapshot of the ECS world state intended for serialization and state restoration.
 */
export interface WorldSnapshot {
  entities: Entity[];
  componentData: ComponentDataSnapshot;
  nextEntityId: number;
  freeEntities: Entity[];
  /** Incremented on structural changes (add/remove entity or component type). */
  structureVersion: number;
  /** Incremented on data changes or visual updates. */
  stateVersion: number;
  /** @deprecated Use rngState for bit-perfect restoration. seed remains for legacy compatibility. */
  seed: number;
  /** Serialized PRNG internal state. Provides bit-perfect restoration. */
  rngState?: number;
  /** Time accumulator from GameLoop. */
  accumulator?: number;
  /** Current simulation tick. */
  tick: number;
}

/**
 * Interface for entity pools.
 */
export interface IEntityPool {
  release(world: World<any, any, any>, entity: Entity): void;
}
