import { World } from "../core/World";
import { Entity, Component } from "../types/EngineTypes";

/**
 * Interface for custom shape drawing logic.
 */
export type ShapeDrawer<TContext> = (
  ctx: TContext,
  entity: Entity,
  pos: { x: number, y: number, rotation: number, scaleX: number, scaleY: number },
  elapsedTime: number,
  render: { shape: string, size: number, color: string, vertices?: { x: number, y: number }[] | null, hitFlashFrames: number, data: Record<string, unknown> | null },
  world: World
) => void;

/**
 * Interface for custom background or foreground effects.
 */
export type EffectDrawer<TContext> = (
  ctx: TContext,
  snapshot: import("./RenderSnapshot").RenderSnapshot,
  width: number,
  height: number,
  world: World
) => void;

/**
 * Interfaz abstracta para los motores de renderizado del juego.
 *
 * @responsibility Definir el contrato para el dibujo de entidades, partículas y efectos.
 * @responsibility Abstraer el backend de renderizado (Canvas, Skia) de la lógica de simulación.
 *
 * @remarks
 * Los renderizadores son consumidores pasivos del {@link World}. No deben mutar componentes
 * de simulación durante el proceso de dibujo. El renderizado suele basarse en snapshots
 * para permitir interpolación y desacoplamiento del frame rate de simulación.
 */
export interface Renderer {
  /** Discriminador del tipo de renderer (e.g., 'canvas', 'skia'). */
  readonly type: string;

  /** Limpia el buffer de dibujo con el color de fondo. */
  clear(): void;

  /**
   * Ejecuta el pipeline completo de renderizado.
   *
   * @param world - El mundo ECS que contiene el estado a dibujar.
   * @param alpha - Factor de interpolación [0, 1] entre el tick anterior y el actual.
   *
   * @precondition El backend de renderizado debe estar inicializado y tener un contexto válido.
   */
  render(world: World, alpha?: number): void;

  /**
   * Dibuja una entidad individual de forma inmediata.
   * @deprecated Se prefiere el uso de snapshots y {@link Renderer.render}.
   */
  drawEntity(entity: Entity, components: Record<string, Component>, world: World): void;

  /** Dibuja el sistema de partículas global. */
  drawParticles(world: World): void;

  /** Ajusta las dimensiones del viewport de renderizado. */
  setSize(width: number, height: number): void;

  /** Registra una función de dibujo para un tipo de forma ('shape'). */
  registerShape(name: string, drawer: ShapeDrawer<TContext>): void;

  /** Registra un drawer que se ejecuta tras el dibujo principal de la entidad. */
  registerPostEntityDrawer(name: string, drawer: ShapeDrawer<TContext>): void;

  /** Registra un efecto visual de fondo (e.g., Starfield). */
  registerBackgroundEffect(name: string, drawer: EffectDrawer<unknown>): void;

  /** Registra un efecto visual de primer plano (e.g., HUD, Post-processing). */
  registerForegroundEffect(name: string, drawer: EffectDrawer<unknown>): void;
}
