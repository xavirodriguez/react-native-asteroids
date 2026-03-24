import { World } from "../core/World";
import { Entity, PositionComponent, RenderComponent } from "../types/EngineTypes";

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
   * Draws a single entity.
   */
  drawEntity(entity: Entity, pos: PositionComponent, render: RenderComponent, world: World): void;

  /**
   * Draws particles separately for efficiency if needed.
   */
  drawParticles(world: World): void;

  /**
   * Sets the viewport size.
   */
  setSize(width: number, height: number): void;
}
