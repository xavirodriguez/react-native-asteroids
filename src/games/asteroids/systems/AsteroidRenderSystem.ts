import { World } from "../../../engine/core/World";
import { RenderUpdateSystem } from "../../../engine/systems/RenderUpdateSystem";
import {
  GAME_CONFIG,
} from "../../../types/GameTypes";

/**
 * System responsible for Asteroids-specific rendering logic.
 * Extends RenderUpdateSystem to inherit generic trail, rotation, and flash logic.
 */
export class AsteroidRenderSystem extends RenderUpdateSystem {
  constructor() {
    // Pass the Asteroids-specific trail length to the engine's generic system
    super(GAME_CONFIG.TRAIL_MAX_LENGTH);
  }

  /**
   * Updates rendering-related state.
   */
  public override update(world: World, deltaTime: number): void {
    // The engine's RenderUpdateSystem now handles trails for all entities with a RenderComponent.
    // Asteroids ships have trailPositions defined in their RenderComponent.
    super.update(world, deltaTime);
  }
}
