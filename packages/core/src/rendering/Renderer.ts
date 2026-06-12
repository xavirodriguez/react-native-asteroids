/**
 * Base interface for all renderers.
 */
export interface Renderer<TContext = any> {
  /**
   * Renders the current world state.
   *
   * @param world - The world instance to render.
   * @param interpolation - A value between 0 and 1 representing the interpolation factor
   *                        between the previous and current simulation ticks.
   */
  render(world: any, interpolation: number): void;

  /**
   * Returns the underlying rendering context.
   */
  getContext(): TContext;
}

export interface ShapeDrawer<TContext = any> {
  draw(context: TContext, world: any, entity: number): void;
}

export interface EffectDrawer<TContext = any> {
  draw(context: TContext, world: any): void;
}
