import { World } from "../ecs/World";
import { Entity } from "../ecs/Entity";
import { Component } from "../ecs/Component";

/**
 * Interface for custom shape drawing logic.
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
    vertices?: ReadonlyArray<{ readonly x: number, readonly y: number }> | null,
    hitFlashFrames: number,
    data: Record<string, unknown> | null
  },
  world: World
) => void;

/**
 * Interface for custom full-screen background or foreground effects.
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
 * @remarks
 * Implementations are expected to handle the visual representation of the ECS world.
 * While core systems aim to minimize allocations, specific renderer implementations
 * may introduce per-frame allocations depending on the underlying platform API
 * (e.g., Canvas, Skia).
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
   */
  render(world: World, alpha?: number): void;

  /**
   * Immediately draws an individual entity.
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
