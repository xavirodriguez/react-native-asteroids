import { World, Renderer, ComponentRegistry } from "@tiny-aster/core";

export class SkiaRenderer<TRegistry extends ComponentRegistry = any> implements Renderer<TRegistry> {
  public render(world: World<TRegistry>, canvas: any): void {
      // Skia implementation
  }
}
