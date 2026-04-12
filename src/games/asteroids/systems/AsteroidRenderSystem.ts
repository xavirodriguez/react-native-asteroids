import { RenderUpdateSystem } from "../../../engine/systems/RenderUpdateSystem";
import {
  GAME_CONFIG,
} from "../../../types/GameTypes";

/**
 * System responsible for Asteroids-specific rendering logic.
 *
 * @remarks
 * Extends the engine's RenderUpdateSystem to inherit generic updates like rotation and trails.
 */
export class AsteroidRenderSystem extends RenderUpdateSystem {
  constructor() {
    // Pass the Asteroids-specific trail length to the engine's generic system
    super(GAME_CONFIG.TRAIL_MAX_LENGTH);
  }
}
