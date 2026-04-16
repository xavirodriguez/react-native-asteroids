import { Component } from "./Component";
import { Entity } from "./Entity";
import { EventBus } from "./EventBus";
import { StateMachine } from "./StateMachine";
import type { World } from "./World";
import type { CollisionManifold } from "../physics/collision/CollisionTypes";
export { Entity, Component };

/**
 * Componentes base proporcionados por el motor como primitivas reutilizables.
 *
 * @remarks
 * Estos componentes forman el esquema fundamental del motor ECS y son consumidos
 * por los sistemas principales (Rendering, Physics, Input).
 *
 * @responsibility Definir la estructura de datos para el estado del mundo.
 */

/**
 * Almacena la posición, rotación y escala de una entidad, gestionando jerarquías espaciales.
 *
 * @responsibility Definir la ubicación y orientación de la entidad en el espacio 2D.
 * @remarks Las propiedades `world*` son calculadas y actualizadas por el `HierarchySystem`.
 *
 * @conceptualRisk [STALE_WORLD_DATA][HIGH] Leer `worldX/Y` antes de que el `HierarchySystem`
 * se ejecute en el frame actual resultará en datos del frame anterior.
 */
export interface TransformComponent extends Component {
  type: "Transform";
  /** Coordenada X local en píxeles. Rango esperado: [-10000, 10000]. */
  x: number;
  /** Coordenada Y local en píxeles. Rango esperado: [-10000, 10000]. */
  y: number;
  /** Rotación local en radianes. Rango: [0, 2π]. */
  rotation: number;
  /** Escala X local. Default: 1.0. */
  scaleX: number;
  /** Escala Y local. Default: 1.0. */
  scaleY: number;

  /** ID de la entidad {@link Entity} padre. Si es undefined, la entidad es raíz. */
  parent?: Entity;
  /** Flag de optimización; si es true, las coordenadas de mundo deben recalcularse. */
  dirty?: boolean;

  /** Coordenada X absoluta en el mundo. Calculada por {@link HierarchySystem}. */
  worldX?: number;
  /** Coordenada Y absoluta en el mundo. Calculada por {@link HierarchySystem}. */
  worldY?: number;
  /** Rotación absoluta en el mundo. Calculada por {@link HierarchySystem}. */
  worldRotation?: number;
  /** Escala X absoluta en el mundo. Calculada por {@link HierarchySystem}. */
  worldScaleX?: number;
  /** Escala Y absoluta en el mundo. Calculada por {@link HierarchySystem}. */
  worldScaleY?: number;
}

/**
 * Almacena el estado de la transformación en el frame anterior.
 *
 * @remarks
 * Esencial para realizar interpolación visual suave (mediante el valor `alpha` del `GameLoop`)
 * cuando la tasa de renderizado es superior a la de simulación (fixed timestep).
 */
export interface PreviousTransformComponent extends Component {
  type: "PreviousTransform";
  x: number;
  y: number;
  rotation: number;
}

/**
 * Define el vector de movimiento y la velocidad angular de una entidad.
 *
 * @responsibility Proveer datos para la integración física de movimiento.
 * @remarks Las unidades son píxeles por segundo (px/s) y radianes por segundo (rad/s).
 */
export interface VelocityComponent extends Component {
  type: "Velocity";
  /** Velocidad lineal en el eje X en px/s. */
  dx: number;
  /** Velocidad lineal en el eje Y en px/s. */
  dy: number;
  /** Velocidad angular en radianes/s (opcional). */
  vAngle?: number;
}

/**
 * Aplica una fuerza de rozamiento o amortiguación a la velocidad.
 */
export interface FrictionComponent extends Component {
  type: "Friction";
  /** Factor de amortiguación entre 0 y 1. (e.g., 0.99 para una pérdida del 1% por tick). */
  value: number;
}

/**
 * Define los límites espaciales para una entidad y su comportamiento al alcanzarlos.
 */
export interface BoundaryComponent extends Component {
  type: "Boundary";
  /** Origen X del área delimitada (opcional, por defecto 0). */
  x?: number;
  /** Origen Y del área delimitada (opcional, por defecto 0). */
  y?: number;
  /** Ancho del área. */
  width: number;
  /** Alto del área. */
  height: number;
  /**
   * Comportamiento al salir de los límites:
   * - `wrap`: aparece por el lado opuesto.
   * - `bounce`: rebota invirtiendo la velocidad.
   * - `destroy`: elimina la entidad del mundo.
   */
  behavior: "wrap" | "bounce" | "destroy";
  /** @deprecated Utilizar {@link BoundaryComponent.behavior} en su lugar. Esta propiedad será eliminada en la v2.0. */
  mode?: "wrap" | "bounce" | "destroy";
  /** Si debe rebotar específicamente en el eje X. */
  bounceX?: boolean;
  /** Si debe rebotar específicamente en el eje Y. */
  bounceY?: boolean;
}

/**
 * Permite añadir etiquetas semánticas a las entidades para filtrado rápido.
 */
export interface TagComponent extends Component {
  type: "Tag";
  /** @deprecated Utilizar {@link TagComponent.tags} en su lugar. Esta propiedad será eliminada en la v2.0. */
  tag?: string;
  /** Lista de etiquetas asociadas (e.g., ["Player", "LocalPlayer"]). */
  tags: string[];
}

/**
 * RigidBodyComponent is used primarily by the Matter.js adapter.
 * For the built-in physics engine, use PhysicsBody2DComponent.
 */
export interface RigidBodyComponent extends Component {
  type: "RigidBody";
  bodyId: number | string;
  isStatic?: boolean;
  isSensor?: boolean;
  restitution?: number;
  friction?: number;
  density?: number;
  collisionFilter?: {
    group: number;
    category: number;
    mask: number;
  };
}

/**
 * Time To Live: Gestiona la destrucción automática de una entidad tras un tiempo.
 */
export interface TTLComponent extends Component {
  type: "TTL";
  /** Tiempo restante de vida (ms). */
  remaining: number;
  /** Tiempo total de vida inicial (ms). */
  total: number;
  /** Callback opcional al finalizar el tiempo de vida. */
  onComplete?: () => void;
}

import { Shape } from "../physics/shapes/ShapeTypes";

/**
 * Modern collider component supporting multiple shapes and collision layers.
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
 * Component that tracks collision events for an entity in a single frame.
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
 * Enables Continuous Collision Detection (CCD) for fast-moving entities.
 */
export interface ContinuousColliderComponent extends Component {
  type: "ContinuousCollider";
  enabled: boolean;
}

/**
 * Rigid body component for the built-in physics engine.
 */
export interface PhysicsBody2DComponent extends Component {
  type: "PhysicsBody2D";
  bodyType: "static" | "dynamic" | "kinematic";
  velocityX: number;
  velocityY: number;
  angularVelocity: number;
  forceX: number;
  forceY: number;
  torque: number;
  mass: number;
  inverseMass: number;
  inertia: number;
  inverseInertia: number;
  restitution: number;
  staticFriction: number;
  dynamicFriction: number;
  gravityScale: number;
  fixedRotation: boolean;
}

/**
 * Define la apariencia y propiedades de visualización de una entidad.
 *
 * @responsibility Proveer la información necesaria para el sistema de renderizado.
 */
export interface RenderComponent extends Component {
  type: "Render";
  /** Identificador del drawer registrado en el renderer (e.g., 'ship', 'circle'). */
  shape: string;
  /** Dimensión base (radio para círculos, lado para rectángulos). En píxeles. */
  size: number;
  /** Color en formato CSS. Default: 'white'. */
  color: string;
  /** Rotación puramente visual en radianes. Suele sincronizarse con {@link TransformComponent}. */
  rotation: number;
  /** Velocidad de rotación automática aplicada por el `RenderUpdateSystem`. */
  angularVelocity?: number;
  /** Lista de puntos locales para formas poligonales. */
  vertices?: { x: number; y: number }[];
  /** Prioridad de profundidad. Valores mayores se renderizan al final. Default: 0. */
  zIndex?: number;
  /** Historial de posiciones para efectos de estela (trail). */
  trailPositions?: { x: number; y: number }[];
  /** Número de frames que la entidad permanecerá en blanco tras un impacto. */
  hitFlashFrames?: number;
  /** Contenedor de metadatos para drawers personalizados. */
  data?: Record<string, unknown>;
}

/**
 * Gestiona la salud y durabilidad de una entidad.
 */
export interface HealthComponent extends Component {
  type: "Health";
  /** Puntos de vida actuales. */
  current: number;
  /** Puntos de vida máximos. */
  max: number;
  /** Tiempo restante de invulnerabilidad (ms). */
  invulnerableRemaining: number;
}

/**
 * Reclaimable component for entities that should be returned to a pool.
 */
export interface ReclaimableComponent extends Component {
  type: "Reclaimable";
  onReclaim: (world: World, entity: Entity) => void;
}

/**
 * Input state component for semantic action handling.
 */
export type InputAction = string;

/**
 * Componente singleton que consolida el estado actual de todas las entradas del usuario.
 *
 * @responsibility Exponer las intenciones del jugador a los sistemas de juego.
 * @remarks Actualizado por el {@link UnifiedInputSystem}.
 */
export interface InputStateComponent extends Component {
  type: "InputState";
  /** Estado de presión de acciones semánticas (e.g., "jump", "fire"). */
  actions: Map<InputAction, boolean>;
  /** Valores normalizados [-1, 1] para ejes (e.g., "horizontal", "vertical"). */
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
 * Animator component for frame-based animations.
 */
export interface AnimationConfig {
  frames: number[];
  fps: number;
  loop: boolean;
  onComplete?: (entity: Entity) => void;
}

export type AnimationMap = Record<string, AnimationConfig>;

export interface AnimatorComponent extends Component {
  type: "Animator";
  animations: AnimationMap;
  current: string;
  frame: number;
  elapsed: number;
}

/**
 * State machine component for complex logic.
 */
export interface StateMachineComponent extends Component {
  type: "StateMachine";
  fsm: StateMachine<string, unknown>;
}

/**
 * Particle emitter configuration and component.
 */
export interface ParticleEmitterConfig {
  position?: { x: number; y: number };
  rate: number;
  burst?: number;
  lifetime: { min: number; max: number };
  speed: { min: number; max: number };
  angle: { min: number; max: number };
  size: { min: number; max: number };
  color: string[];
  gravity?: { x: number; y: number };
  loop: boolean;
}

export interface ParticleEmitterComponent extends Component {
  type: "ParticleEmitter";
  config: ParticleEmitterConfig;
  active: boolean;
  elapsed: number;
}

/**
 * Tilemap data and component.
 */
export interface Tileset {
  id: number;
  textureId: string;
  solid: boolean;
}

export interface TilemapLayer {
  name: string;
  tiles: number[];
  collidable: boolean;
}

export interface TilemapData {
  tileSize: number;
  width: number;
  height: number;
  layers: TilemapLayer[];
  tilesets: Tileset[];
}

export interface TilemapComponent extends Component {
  type: "Tilemap";
  data: TilemapData;
  _visibleRange?: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  };
}

/**
 * Camera 2D component.
 */
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
  bounds: { minX: number; minY: number; maxX: number; maxY: number } | null;
  target?: Entity;
}

/**
 * Common data structures.
 */

export interface ScreenShakeComponent extends Component {
  type: "ScreenShake";
  intensity: number;
  duration: number;
  remaining: number;
  config?: {
    intensity: number;
    duration: number;
  };
}

/**
 * Component used for non-simulated visual offsets (juice, screen shake, etc).
 * Renderers should add these values to the Transform values.
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
 * Star component for background effects.
 */
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
