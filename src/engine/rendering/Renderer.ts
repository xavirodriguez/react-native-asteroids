import { World } from "../core/World";
import { Entity, Component } from "../types/EngineTypes";

/**
 * Interface for custom shape drawing logic.
 *
 * @param ctx - The backend-specific drawing context (e.g., CanvasRenderingContext2D).
 * @param entity - The ID of the entity being drawn.
 * @param pos - Final visual transform (already interpolated and with offsets).
 * @param elapsedTime - Total simulation time (ms).
 * @param render - Captured render component data.
 * @param world - The ECS world (provided for read-only access to related state).
 *
 * @public
 */
export type ShapeDrawer<TContext> = (
  ctx: TContext,
  entity: Entity,
  pos: { x: number, y: number, rotation: number, scaleX: number, scaleY: number },
  elapsedTime: number,
  render: {
    shape: string,
    size: number,
    color: string,
    vertices?: { x: number, y: number }[] | null,
    hitFlashFrames: number,
    data: Record<string, unknown> | null
  },
  world: World
) => void;

/**
 * Interface for custom full-screen background or foreground effects.
 *
 * @param ctx - The drawing context.
 * @param snapshot - Complete state of the current frame.
 * @param width - Viewport width.
 * @param height - Viewport height.
 * @param world - The ECS world.
 *
 * @public
 */
export type EffectDrawer<TContext> = (
  ctx: TContext,
  snapshot: import("./RenderSnapshot").RenderSnapshot,
  width: number,
  height: number,
  world: World
) => void;

/**
 * Abstract interface for game rendering engines.
 *
 * @responsibility Define the contract for drawing entities, particles, and effects.
 * @responsibility Abstract the rendering backend (Canvas, Skia) from simulation logic.
 *
 * @remarks
 * Renderers are designed as read-only consumers of the {@link World}.
 * The drawing process should never mutate simulation components.
 * The architecture relies on snapshots and interpolation (alpha) to decouple
 * render frequency from simulation frequency.
 *
 * @public
 */
export interface Renderer<TContext = unknown> {
  /** Renderer type identifier (e.g., 'canvas', 'skia'). */
  readonly type: string;

  /**
   * Clears the drawing buffer with the background color.
   */
  clear(): void;

  /**
   * Executes the full rendering pipeline for a frame.
   *
   * @param world - The ECS world containing the state to draw.
   * @param alpha - [0, 1] Interpolation factor between the previous and current tick.
   *
   * @remarks
   * Pipeline order:
   * 1. Background Effects.
   * 2. World Entities (Sorted by Z-Index).
   * 3. Particles.
   * 4. Post-Entity overlays.
   * 5. Foreground Effects / HUD.
   *
   * @precondition Backend context must be initialized.
   */
  render(world: World, alpha?: number): void;

  /**
   * Immediately draws an individual entity.
   * @deprecated Prefer using the batched {@link Renderer.render} pipeline.
   */
  drawEntity(entity: Entity, components: Record<string, Component>, world: World): void;

  /**
   * Draws the global particle system.
   */
  drawParticles(world: World): void;

  /**
   * Updates viewport dimensions.
   */
  setSize(width: number, height: number): void;

  /**
   * Registers a custom drawing function for a specific 'shape' identifier.
   */
  registerShape(name: string, drawer: ShapeDrawer<TContext>): void;

  /**
   * Registers a drawer to be executed after the main entity drawing pass.
   */
  registerPostEntityDrawer(name: string, drawer: ShapeDrawer<TContext>): void;

  /**
   * Registers a full-screen background visual effect.
   */
  registerBackgroundEffect(name: string, drawer: EffectDrawer<TContext>): void;

  /**
   * Registers a full-screen foreground or post-processing effect.
   */
  registerForegroundEffect(name: string, drawer: EffectDrawer<TContext>): void;
}
