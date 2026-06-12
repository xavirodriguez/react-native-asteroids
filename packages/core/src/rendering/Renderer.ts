export interface Renderer<TContext = any> {
  render(world: any, interpolation: number): void;
  getContext(): TContext;
}

export interface ShapeDrawer<TContext = any> {
  draw(context: TContext, world: any, entity: number): void;
}

export interface EffectDrawer<TContext = any> {
  draw(context: TContext, world: any): void;
}
