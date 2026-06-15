import { World } from "../../ecs/World";
import { Renderer } from "../../core/Renderer";
import { ComponentRegistry } from "../../ecs/Component";

export class SkiaRenderer<TRegistry extends ComponentRegistry = any> implements Renderer<TRegistry> {
  public render(world: World<TRegistry>, canvas: any): void {
  }
}
