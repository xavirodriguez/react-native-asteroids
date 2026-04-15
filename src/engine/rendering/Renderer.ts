import { World } from "../core/World";
import { Entity, Component } from "../types/EngineTypes";

/**
 * Interface for custom shape drawing logic.
 */
export type ShapeDrawer<TContext> = (
  ctx: TContext,
  entity: Entity,
  pos: { x: number, y: number, rotation: number, scaleX: number, scaleY: number },
  render: { shape: string, size: number, color: string, vertices?: { x: number, y: number }[] | null, hitFlashFrames: number, data: Record<string, unknown> | null }
) => void;

/**
 * Interface for custom background or foreground effects.
 */
export type EffectDrawer<TContext> = (
  ctx: TContext,
  snapshot: import("./RenderSnapshot").RenderSnapshot,
  width: number,
  height: number
) => void;

/**
 * Abstract interface for game renderers.
 */
export interface Renderer {
  readonly type: string;

  clear(): void;

  render(world: World, alpha?: number): void;

  drawEntity(entity: Entity, components: Record<string, Component>, world: World): void;

  drawParticles(world: World): void;

  setSize(width: number, height: number): void;

  registerShape(name: string, drawer: ShapeDrawer<unknown>): void;

  registerBackgroundEffect(name: string, drawer: EffectDrawer<unknown>): void;

  registerForegroundEffect(name: string, drawer: EffectDrawer<unknown>): void;
}
