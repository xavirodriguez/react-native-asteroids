import { World } from "../core/World";
import { Entity, Component, TransformComponent, RenderComponent } from "../types/EngineTypes";

/**
 * Interfaz para la lógica de dibujo de formas personalizadas.
 *
 * @remarks
 * Los juegos pueden registrar sus propios dibujadores para extender las capacidades visuales
 * sin modificar el motor core.
 */
export type ShapeDrawer<TContext> = (
  ctx: TContext,
  entity: Entity,
  pos: TransformComponent,
  render: RenderComponent,
  world: World
) => void;

/**
 * Interfaz para efectos personalizados de fondo (background) o primer plano (foreground).
 *
 * @remarks
 * Útil para efectos globales como starfields, post-procesado CRT o partículas de ambiente.
 */
export type EffectDrawer<TContext> = (
  ctx: TContext,
  world: World,
  width: number,
  height: number
) => void;

/**
 * Interfaz abstracta para los renderizadores de juego.
 * Define el contrato que debe cumplir cualquier backend de renderizado (Canvas, Skia, SVG).
 *
 * @remarks
 * El diseño permite cambiar el backend de renderizado de forma transparente para la lógica ECS.
 */
export interface Renderer {
  /**
   * Identificador único del tipo de renderizador (e.g., 'canvas', 'skia').
   */
  readonly type: string;

  /**
   * Limpia la superficie de dibujo.
   * Normalmente rellena el fondo con un color sólido o lo deja transparente.
   */
  clear(): void;

  /**
   * Renderiza el estado actual del mundo ECS completo.
   *
   * @remarks
   * Implementa el pipeline principal de renderizado: limpieza, efectos de fondo,
   * dibujo de entidades por zIndex y efectos de primer plano.
   *
   * @param world - El mundo ECS a renderizar.
   */
  render(world: World): void;

  /**
   * Dibuja una única entidad utilizando sus componentes.
   *
   * @param entity - El ID de la entidad.
   * @param components - Mapa de tipos de componentes a instancias para la entidad.
   * @param world - El mundo ECS para contexto adicional.
   */
  drawEntity(entity: Entity, components: Record<string, Component>, world: World): void;

  /**
   * Draws particles separately for efficiency.
   */
  drawParticles(world: World): void;

  /**
   * Sets the viewport size.
   */
  setSize(width: number, height: number): void;

  /**
   * Registers a custom shape drawer.
   */
  registerShape(name: string, drawer: ShapeDrawer<any>): void;

  /**
   * Registers a background effect.
   */
  registerBackgroundEffect(name: string, drawer: EffectDrawer<any>): void;

  /**
   * Registers a foreground effect.
   */
  registerForegroundEffect(name: string, drawer: EffectDrawer<any>): void;
}
