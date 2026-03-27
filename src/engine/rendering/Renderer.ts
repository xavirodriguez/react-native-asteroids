import { World } from "../core/World";
import { Entity, Component } from "../types/EngineTypes";

/**
 * Abstract interface for game renderers in TinyAsterEngine.
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
   * Draws a single entity using its components.
   *
   * @param entity - The entity ID.
   * @param components - A map of component types to component instances.
   * @param world - The ECS world for context.
   */
  drawEntity(entity: Entity, components: Record<string, Component>, world: World): void;

  /**
   * Draws particles separately for efficiency.
   */
  drawParticles(world: World): void;

  /**
   * Sets the viewport size.
   */
  setSize(width: number, height: number): void;
}
