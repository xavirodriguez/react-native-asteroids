import { World } from "../core/World";
import { Entity, PositionComponent, RenderComponent } from "../types/EngineTypes";

/**
 * Interface for custom shape drawing logic.
 */
export type ShapeDrawer<TContext> = (
  ctx: TContext,
  entity: Entity,
  pos: PositionComponent,
  render: RenderComponent,
  world: World
) => void;

/**
 * Interface for custom background/foreground effects.
 */
export type EffectDrawer<TContext> = (
  ctx: TContext,
  world: World,
  width: number,
  height: number
) => void;

/**
 * Abstract interface for game renderers.
 */
export interface Renderer {
  /**
   * The type identifier for the renderer (e.g., 'canvas', 'skia').
   */
  readonly type: string;

  /**
   * Clears the drawing surface.
   */
  clear(): void;

  /**
   * Renders the current world state.
   *
   * @param world - The ECS world.
   */
  render(world: World): void;

  /**
   * Draws a single entity.
   */
  drawEntity(entity: Entity, pos: PositionComponent, render: RenderComponent, world: World): void;

  /**
   * Draws particles separately for efficiency if needed.
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
