import { World } from "../ecs/World";
import { ComponentRegistry } from "../ecs/Component";

/**
 * Interface for a generic renderer that can visualize the state of an ECS world.
 *
 * @typeParam TRegistry - The component registry used by the world.
 * @typeParam TContext - The specific rendering context (e.g., CanvasRenderingContext2D, Skia Canvas).
 */
export interface Renderer<TRegistry extends ComponentRegistry = ComponentRegistry, TContext = unknown> {
  /**
   * Renders the current state of the world.
   * @param world - The ECS world to render.
   * @param ctx - The rendering context.
   * @param interpolation - Optional interpolation factor for smooth rendering between fixed timesteps.
   */
  render(world: World<TRegistry>, ctx: TContext, interpolation?: number): void;
}

/**
 * Interface for drawing individual shapes or entities.
 */
export interface ShapeDrawer<TContext = unknown, TRegistry extends ComponentRegistry = ComponentRegistry> {
  /**
   * Draws a specific entity to the context.
   * @param context - The rendering context.
   * @param world - The ECS world.
   * @param entity - The entity to draw.
   */
  draw(context: TContext, world: World<TRegistry>, entity: number): void;
}

/**
 * Interface for drawing global screen effects.
 */
export interface EffectDrawer<TContext = unknown, TRegistry extends ComponentRegistry = ComponentRegistry> {
  /**
   * Draws effects to the context.
   * @param context - The rendering context.
   * @param world - The ECS world.
   */
  draw(context: TContext, world: World<TRegistry>): void;
}
