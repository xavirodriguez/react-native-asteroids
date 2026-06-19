import { World, Renderer, ComponentRegistry } from "@tiny-aster/core";

/**
 * Minimal Skia renderer implementation.
 *
 * @warning
 * **Experimental**: This renderer is currently a minimal/placeholder
 * implementation and does not yet support full game rendering features.
 */
export class SkiaRenderer<TRegistry extends ComponentRegistry = any> implements Renderer<TRegistry> {
  public render(world: World<TRegistry>, canvas: any): void {
      console.log("Skia rendering...");
  }
}
