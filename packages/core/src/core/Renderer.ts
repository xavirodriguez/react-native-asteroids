import { World } from "../ecs/World";
import { ComponentRegistry } from "../ecs/Component";

export interface Renderer<TRegistry extends ComponentRegistry = any> {
  render(world: World<TRegistry>, ctx: any): void;
}
