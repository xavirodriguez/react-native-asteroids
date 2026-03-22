import { World } from "../core/World";

/**
 * Abstract interface for game renderers.
 */
export interface Renderer {
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
   * Sets the viewport size.
   */
  setSize(width: number, height: number): void;
}
