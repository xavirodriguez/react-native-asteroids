import { World } from "../ecs/World";
import { ComponentRegistry } from "../ecs/Component";

export interface Renderer<TRegistry extends ComponentRegistry = any, TContext = any> {
  render(world: World<TRegistry>, ctx: TContext, interpolation?: number): void;
}

export interface ShapeDrawer<TContext = any, TRegistry extends ComponentRegistry = any> {
  draw(context: TContext, world: World<TRegistry>, entity: number): void;
}

export interface EffectDrawer<TContext = any, TRegistry extends ComponentRegistry = any> {
  draw(context: TContext, world: World<TRegistry>): void;
}
