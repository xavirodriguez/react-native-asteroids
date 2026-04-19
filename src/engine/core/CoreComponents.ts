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
 * @responsibility Proveer datos históricos para interpolación visual.
 *
 * @remarks
 * Esencial para realizar interpolación visual suave (mediante el valor `alpha` del `GameLoop`)
 * cuando la tasa de renderizado es superior a la de simulación (fixed timestep).
 *
 * @conceptualRisk [STALE_SNAPSHOT][LOW] Si este componente no se actualiza al inicio de cada
 * tick de simulación (Fixed Update), la interpolación producirá jitter visual.
 */
export interface PreviousTransformComponent extends Component {
  type: "PreviousTransform";
  /** Posición X en el tick anterior (píxeles). Unidades: px. */
  x: number;
  /** Posición Y en el tick anterior (píxeles). Unidades: px. */
  y: number;
  /** Rotación en el tick anterior (radianes). Rango: [0, 2π]. */
  rotation: number;

  /** Coordenada X absoluta en el mundo en el tick anterior. Unidades: px. */
  worldX?: number;
  /** Coordenada Y absoluta en el mundo en el tick anterior. Unidades: px. */
  worldY?: number;
  /** Rotación absoluta en el mundo en el tick anterior. Unidades: rad. */
  worldRotation?: number;
}

/**
 * Define el vector de movimiento y la velocidad angular de una entidad.
 *
 * @responsibility Proveer datos para la integración física de movimiento.
 *
 * @remarks Las unidades son píxeles por segundo (px/s) y radianes por segundo (rad/s).
 * Consumido por {@link MovementSystem}.
 */
export interface VelocityComponent extends Component {
  type: "Velocity";
  /** Velocidad lineal en el eje X en px/s. Rango sugerido: [-2000, 2000]. */
  dx: number;
  /** Velocidad lineal en el eje Y en px/s. Rango sugerido: [-2000, 2000]. */
  dy: number;
  /** Velocidad angular en radianes/s (opcional). */
  vAngle?: number;
}

/**
 * Aplica una fuerza de rozamiento o amortiguación a la velocidad.
 *
 * @responsibility Reducir la velocidad lineal de una entidad a lo largo del tiempo.
 * @remarks Consumido por `FrictionSystem`.
 */
export interface FrictionComponent extends Component {
  type: "Friction";
  /** Factor de amortiguación entre 0 y 1. (e.g., 0.99 para una pérdida del 1% por tick). */
  value: number;
}

/**
 * Define los límites espaciales para una entidad y su comportamiento al alcanzarlos.
 *
 * @responsibility Restringir el movimiento de la entidad a un área rectangular.
 * @responsibility Definir la respuesta (teletransporte, rebote o muerte) al salir del área.
 *
 * @remarks Consumido por {@link BoundarySystem}.
 */
export interface BoundaryComponent extends Component {
  type: "Boundary";
  /** Origen X del área delimitada en coordenadas de mundo. Por defecto 0. */
  x?: number;
  /** Origen Y del área delimitada en coordenadas de mundo. Por defecto 0. */
  y?: number;
  /** Ancho del área en píxeles. */
  width: number;
  /** Alto del área en píxeles. */
  height: number;
  /**
   * Comportamiento al salir de los límites:
   * - `wrap`: aparece por el lado opuesto (estilo Asteroids).
   * - `bounce`: rebota invirtiendo la velocidad (estilo Pong).
   * - `destroy`: elimina la entidad del mundo (proyectiles).
   */
  behavior: "wrap" | "bounce" | "destroy";
  /** Si debe rebotar específicamente en el eje X. */
  bounceX?: boolean;
  /** Si debe rebotar específicamente en el eje Y. */
  bounceY?: boolean;
}

/**
 * Permite añadir etiquetas semánticas a las entidades para filtrado rápido.
 *
 * @responsibility Proveer metadatos de cadena para la identificación lógica de entidades.
 */
export interface TagComponent extends Component {
  type: "Tag";
  /** Lista de etiquetas asociadas (e.g., ["Player", "LocalPlayer"]). */
  tags: string[];
}

/**
 * Time To Live: Gestiona la destrucción automática de una entidad tras un tiempo.
 *
 * @responsibility Eliminar la entidad del mundo una vez transcurrido el tiempo asignado.
 * @remarks Las unidades están en milisegundos. Consumido por {@link TTLSystem}.
 */
export interface TTLComponent extends Component {
  type: "TTL";
  /** Tiempo restante de vida en milisegundos. */
  remaining: number;
  /** Tiempo total de vida inicial en milisegundos. */
  total: number;
  /** Callback opcional al finalizar el tiempo de vida. */
  onComplete?: () => void;
}

import { Shape } from "../physics/shapes/ShapeTypes";

/**
 * Componente de colisión moderno que soporta múltiples formas y capas de colisión.
 *
 * @responsibility Definir el volumen físico y las reglas de filtrado para la detección de colisiones.
 */
export interface Collider2DComponent extends Component {
  type: "Collider2D";
  /** Definición geométrica de la forma (Circle, AABB, etc.). */
  shape: Shape;
  /** Desplazamiento horizontal relativo al centro de la entidad en píxeles. */
  offsetX: number;
  /** Desplazamiento vertical relativo al centro de la entidad en píxeles. */
  offsetY: number;
  /** Máscara de bits representando la capa a la que pertenece este objeto. */
  layer: number;
  /** Máscara de bits que define con qué capas puede colisionar este objeto. */
  mask: number;
  /** Si es true, la colisión no genera respuesta física (rebote) pero sí eventos de trigger. */
  isTrigger: boolean;
  /** Permite activar/desactivar el collider sin eliminar el componente. */
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
 * Componente de cuerpo rígido para el motor de física integrado.
 *
 * @responsibility Almacenar propiedades dinámicas y materiales para la simulación física impulsiva.
 * @remarks Las unidades están estandarizadas en píxeles, segundos y radianes.
 */
export interface PhysicsBody2DComponent extends Component {
  type: "PhysicsBody2D";
  /**
   * - `static`: No se mueve y tiene masa infinita.
   * - `dynamic`: Afectado por fuerzas y gravedad.
   * - `kinematic`: Se mueve por velocidad manual, masa infinita.
   */
  bodyType: "static" | "dynamic" | "kinematic";
  /** Velocidad lineal en X (px/s). */
  velocityX: number;
  /** Velocidad lineal en Y (px/s). */
  velocityY: number;
  /** Velocidad de rotación (rad/s). */
  angularVelocity: number;
  /** Fuerza acumulada en X para el tick actual. */
  forceX: number;
  /** Fuerza acumulada en Y para el tick actual. */
  forceY: number;
  /** Torque acumulado para el tick actual. */
  torque: number;
  /** Masa del objeto. */
  mass: number;
  /** Masa inversa (1/masa). Cacheada para optimizar cálculos. */
  inverseMass: number;
  /** Momento de inercia. */
  inertia: number;
  /** Inercia inversa. */
  inverseInertia: number;
  /** Coeficiente de restitución (rebote). Rango: [0, 1]. */
  restitution: number;
  /** Rozamiento cuando el objeto está en reposo. */
  staticFriction: number;
  /** Rozamiento durante el movimiento. */
  dynamicFriction: number;
  /** Multiplicador de la gravedad global aplicada a este cuerpo. */
  gravityScale: number;
  /** Si es true, el objeto no rotará por fuerzas externas. */
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
 * Componente que marca una entidad para ser reciclada en lugar de destruida.
 *
 * @responsibility Proporcionar un gancho para devolver la entidad a su pool de origen.
 * @remarks Utilizado por el sistema de pooling de proyectiles y partículas.
 */
export interface ReclaimableComponent extends Component {
  type: "Reclaimable";
  /** Callback ejecutado por el World cuando la entidad se libera. */
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
 * Configuración para una secuencia de animación.
 */
export interface AnimationConfig {
  /** Índices de los frames en el atlas o tileset. */
  frames: number[];
  /** Fotogramas por segundo de la animación. */
  fps: number;
  /** Si la animación debe reiniciarse al terminar. */
  loop: boolean;
  /** Callback ejecutado al finalizar una animación no cíclica. */
  onComplete?: (entity: Entity) => void;
}

export type AnimationMap = Record<string, AnimationConfig>;

/**
 * Gestiona la reproducción de animaciones basadas en frames.
 *
 * @responsibility Controlar el estado de la animación actual y el avance de frames.
 * @remarks Consumido por `AnimationSystem`.
 */
export interface AnimatorComponent extends Component {
  type: "Animator";
  /** Diccionario de animaciones disponibles por nombre. */
  animations: AnimationMap;
  /** Identificador de la animación en reproducción. */
  current: string;
  /** Índice del frame actual dentro de la animación activa. */
  frame: number;
  /** Tiempo acumulado en el frame actual (ms). */
  elapsed: number;
}

/**
 * Componente que encapsula una Máquina de Estados Finitos.
 *
 * @responsibility Gestionar transiciones de estado complejas para la IA o lógica de entidad.
 * @remarks Basado en la clase {@link StateMachine}.
 */
export interface StateMachineComponent extends Component {
  type: "StateMachine";
  /** Instancia de la FSM. */
  fsm: StateMachine<string, unknown>;
}

/**
 * Configuración declarativa para un emisor de partículas.
 */
export interface ParticleEmitterConfig {
  /** Posición de emisión relativa (opcional). */
  position?: { x: number; y: number };
  /** Partículas por segundo. 0 para solo ráfagas. */
  rate: number;
  /** Número de partículas a emitir instantáneamente al inicio. */
  burst?: number;
  /** Rango de vida de la partícula en milisegundos. */
  lifetime: { min: number; max: number };
  /** Rango de velocidad inicial en px/s. */
  speed: { min: number; max: number };
  /** Rango de ángulo de emisión en grados [0, 360]. */
  angle: { min: number; max: number };
  /** Rango de tamaño inicial de la partícula. */
  size: { min: number; max: number };
  /** Paleta de colores aleatorios para las partículas. */
  color: string[];
  /** Vector de gravedad aplicado a cada partícula (px/s²). */
  gravity?: { x: number; y: number };
  /** Si el emisor debe reiniciarse automáticamente. */
  loop: boolean;
}

/**
 * Gestiona la generación de partículas en el mundo.
 *
 * @responsibility Orquestar el spawn de entidades de partícula basado en la configuración.
 * @remarks Consumido por `ParticleSystem`.
 */
export interface ParticleEmitterComponent extends Component {
  type: "ParticleEmitter";
  /** Configuración del comportamiento de emisión. */
  config: ParticleEmitterConfig;
  /** Control de encendido/apagado del emisor. */
  active: boolean;
  /** Tiempo acumulado para el control de la tasa de emisión (s). */
  elapsed: number;
}

/**
 * Definición de un conjunto de tiles (tileset).
 */
export interface Tileset {
  /** Identificador único del tileset. */
  id: number;
  /** ID del recurso de textura asociado. */
  textureId: string;
  /** Si los tiles de este conjunto son sólidos por defecto. */
  solid: boolean;
}

/**
 * Capa individual de un mapa de tiles.
 */
export interface TilemapLayer {
  /** Nombre de la capa (ej: 'Suelo', 'Obstáculos'). */
  name: string;
  /** Array plano de IDs de tiles (row-major). */
  tiles: number[];
  /** Si esta capa debe participar en el sistema de colisiones. */
  collidable: boolean;
}

/**
 * Datos estructurales de un mapa de tiles 2D.
 */
export interface TilemapData {
  /** Tamaño de cada tile cuadrado en píxeles. */
  tileSize: number;
  /** Ancho del mapa en número de tiles. */
  width: number;
  /** Alto del mapa en número de tiles. */
  height: number;
  /** Colección de capas ordenadas. */
  layers: TilemapLayer[];
  /** Referencias a los tilesets utilizados. */
  tilesets: Tileset[];
}

/**
 * Representa un mapa de tiles estático o dinámico.
 *
 * @responsibility Proveer datos de entorno y colisión basados en rejilla.
 */
export interface TilemapComponent extends Component {
  type: "Tilemap";
  /** Datos completos del mapa. */
  data: TilemapData;
  /** Cache interna para optimizar el renderizado (culling). */
  _visibleRange?: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  };
}

/**
 * Representa una cámara 2D para el control del viewport.
 *
 * @responsibility Definir la ventana de visualización y aplicar transformaciones de vista.
 * @remarks Soporta suavizado de movimiento (smoothing) y efectos de sacudida (shake).
 */
export interface Camera2DComponent extends Component {
  type: "Camera2D";
  /** Centro X de la cámara en el mundo. */
  x: number;
  /** Centro Y de la cámara en el mundo. */
  y: number;
  /** Nivel de zoom (1.0 = 100%). */
  zoom: number;
  /** Intensidad actual del efecto de sacudida. */
  shakeIntensity: number;
  /** Desplazamiento X temporal por sacudida. */
  shakeOffsetX: number;
  /** Desplazamiento Y temporal por sacudida. */
  shakeOffsetY: number;
  /** Factor de interpolación para el seguimiento (0.1 = lento, 1.0 = instantáneo). */
  smoothing: number;
  /** Desplazamiento relativo al centro de la pantalla (px). */
  offset: { x: number; y: number };
  /** Límites de movimiento de la cámara en coordenadas de mundo. */
  bounds: { minX: number; minY: number; maxX: number; maxY: number } | null;
  /** Entidad opcional a la que la cámara debe seguir. */
  target?: Entity;
}

/**
 * Common data structures.
 */

/**
 * Efecto de sacudida de pantalla controlado por tiempo.
 *
 * @responsibility Aplicar desplazamientos aleatorios a la cámara para enfatizar impactos.
 * @remarks Consumido por `ScreenShakeSystem`.
 */
export interface ScreenShakeComponent extends Component {
  type: "ScreenShake";
  /** Fuerza máxima del desplazamiento (px). */
  intensity: number;
  /** Duración total del efecto (ms). */
  duration: number;
  /** Tiempo restante del efecto (ms). */
  remaining: number;
  /** Configuración original para reinicios o loops. */
  config?: {
    intensity: number;
    duration: number;
  };
}

/**
 * Componente utilizado para desplazamientos visuales no simulados (Juice, Screen Shake, etc).
 *
 * @responsibility Separar los efectos visuales de la posición lógica/física de la entidad.
 * @remarks Los renderizadores deben sumar estos valores a los del `Transform` al dibujar.
 */
export interface VisualOffsetComponent extends Component {
  type: "VisualOffset";
  /** Desplazamiento visual en X. */
  x: number;
  /** Desplazamiento visual en Y. */
  y: number;
  /** Rotación visual adicional en radianes. */
  rotation: number;
  /** Factor de escala visual en X. */
  scaleX: number;
  /** Factor de escala visual en Y. */
  scaleY: number;
}

/**
 * Representa una estrella procedural para fondos galácticos.
 *
 * @responsibility Proveer datos para el efecto visual de campo estelar.
 */
export interface Star extends Component {
  type: "Star";
  /** Posición X en el espacio virtual. */
  x: number;
  /** Posición Y en el espacio virtual. */
  y: number;
  /** Radio de la estrella (px). */
  size: number;
  /** Opacidad actual [0, 1]. */
  alpha: number;
  /** Brillo base. */
  brightness: number;
  /** Fase actual de la animación de parpadeo (twinkle). */
  twinklePhase: number;
  /** Velocidad de la animación de parpadeo. */
  twinkleSpeed: number;
  /** Capa de profundidad (Parallax). 0 es el fondo más lejano. */
  layer: number;
}
