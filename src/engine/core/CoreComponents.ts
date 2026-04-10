import { Component } from "./Component";
import { Entity } from "./Entity";
import { EventBus } from "./EventBus";
import { StateMachine } from "./StateMachine";

export { Entity, Component };

/**
 * Componentes base proporcionados por el motor como primitivas reutilizables.
 *
 * @remarks
 * Estos componentes forman el esquema fundamental del motor ECS y son consumidos
 * por los sistemas principales (Rendering, Physics, Input).
 *
 * @responsibility Definir la estructura de datos para el estado del mundo.
 * @packageDocumentation
 */

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
 * Componente principal para posicionamiento y jerarquía espacial.
 *
 * @remarks
 * Sustituye al antiguo PositionComponent añadiendo rotación, escala y soporte para
 * jerarquías mediante el campo `parent`.
 *
 * @conceptualRisk [TRANSFORM] La mezcla de coordenadas locales (x, y) y calculadas (worldX, worldY)
 * en el mismo componente puede llevar a errores si un sistema lee las globales antes de que el
 * `HierarchySystem` las actualice en el frame actual.
 */
export interface TransformComponent extends Component {
  type: "Transform";
  /** Coordenada X local al padre (o global si no hay padre) en píxeles. */
  x: number;
  /** Coordenada Y local al padre (o global si no hay padre) en píxeles. */
  y: number;
  /** Rotación en radianes. */
  rotation: number;
  /** Factor de escala horizontal. */
  scaleX: number;
  /** Factor de escala vertical. */
  scaleY: number;
  /** ID de la entidad padre para transformaciones jerárquicas. */
  parent?: Entity;

  /** Coordenada X absoluta en el mundo (calculada por HierarchySystem). */
  worldX?: number;
  /** Coordenada Y absoluta en el mundo (calculada por HierarchySystem). */
  worldY?: number;
  /** Rotación absoluta en el mundo (calculada por HierarchySystem). */
  worldRotation?: number;
  /** Escala X absoluta en el mundo (calculada por HierarchySystem). */
  worldScaleX?: number;
  /** Escala Y absoluta en el mundo (calculada por HierarchySystem). */
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
 * Define la velocidad lineal de una entidad.
 */
export interface VelocityComponent extends Component {
  type: "Velocity";
  /** Variación de píxeles en el eje X por tick de simulación (si se integra con deltaTime). */
  dx: number;
  /** Variación de píxeles en el eje Y por tick de simulación. */
  dy: number;
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
  /** @deprecated Utilizar `behavior`. */
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
  /** @deprecated Utilizar `tags`. */
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
}

/**
 * @deprecated Use Collider2DComponent instead for multi-shape support
 */
export interface ColliderComponent extends Component {
  type: "Collider";
  radius: number;
}

/**
 * Contiene los datos necesarios para que el motor de renderizado dibuje la entidad.
 *
 * @remarks
 * Actúa como una interfaz de datos entre la simulación y el pipeline de renderizado
 * (CanvasRenderer, SkiaRenderer).
 *
 * @conceptualRisk [RENDERING] `trailPositions` crece sin un límite explícito en la definición
 * del componente, lo que podría impactar el rendimiento de memoria si no se gestiona por un sistema.
 */
export interface RenderComponent extends Component {
  type: "Render";
  /** Nombre del dibujador de forma registrado (e.g., "triangle", "circle"). */
  shape: string;
  /** Tamaño base de la forma (e.g., radio para círculos). */
  size: number;
  /** Color en formato CSS o hexadecimal. */
  color: string;
  /** Rotación visual (puede diferir de la rotación física). */
  rotation: number;
  /** Velocidad de rotación automática. */
  angularVelocity?: number;
  /** Lista de vértices si la forma es un polígono. */
  vertices?: { x: number; y: number }[];
  /** Orden de dibujo (capas). Valores más altos se dibujan encima. */
  zIndex?: number;
  /** Historial de posiciones para efectos de estela (trail). */
  trailPositions?: { x: number; y: number }[];
  /** Número de frames restantes para el efecto de destello (hit flash). */
  hitFlashFrames?: number;
  /** Datos personalizados consumidos por shape drawers específicos del juego. */
  data?: Record<string, any>;
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
  onReclaim: (world: any, entity: any) => void;
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
 * Input state component for semantic action handling.
 */
export type InputAction = string;

/**
 * Singleton que almacena el estado unificado de las entradas del usuario.
 *
 * @remarks
 * Las acciones son booleanas (presionado o no), mientras que los ejes son valores
 * normalizados (típicamente entre -1.0 y 1.0).
 *
 * @responsibility Proporcionar una vista desacoplada del estado de entrada para los sistemas.
 */
export interface InputStateComponent extends Component {
  type: "InputState";
  /** Mapa de acciones activas (e.g., "shoot" -> true). */
  actions: Map<InputAction, boolean>;
  /** Mapa de valores de ejes (e.g., "horizontal" -> -1.0 a 1.0). */
  axes: Map<string, number>;
  /** @deprecated Use InputUtils.isPressed instead */
  isPressed?: (action: InputAction) => boolean;
  /** @deprecated Use InputUtils.getAxis instead */
  getAxis?: (axis: string) => number;
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
  fsm: StateMachine<any, any>;
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
  /** @deprecated Use TilemapUtils.isSolid instead */
  isSolid?: (tileX: number, tileY: number) => boolean;
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
export interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

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
 * Legacy ScreenShake interface for compatibility.
 * @deprecated Use ScreenShakeComponent instead.
 */
export interface ScreenShake {
  intensity: number;
  duration: number;
  remaining: number;
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
  zOrder: number;
  opacity?: number;
  renderType?: string;
  size?: any;
  radius?: number;
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
  twinkleSpeed: number;
}
