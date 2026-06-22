import { World, Renderer, ComponentRegistry } from "@tiny-aster/core";

/**
 * Minimal Skia renderer implementation.
 *
 * @remarks
 * Designed for use in environments where Skia is available (e.g. React Native via `shopify/react-native-skia`).
 *
 * @warning
 * **Experimental**: This renderer is currently a minimal/placeholder
 * implementation and does not yet support the full range of visual components
 * available in the engine.
 */
export class SkiaRenderer<TRegistry extends ComponentRegistry = any> implements Renderer<TRegistry> {
  public render(world: World<TRegistry>, canvas: any): void {
      console.log("Skia rendering...");
  }
}
