import { RenderUpdateSystem } from "../../../engine/systems/RenderUpdateSystem";

/**
 * System responsible for Asteroids-specific rendering logic.
 *
 * @remarks
 * Extends the engine's RenderUpdateSystem to inherit generic updates like rotation and trails.
 */
export class AsteroidRenderSystem extends RenderUpdateSystem {
  constructor(trailMaxLength: number) {
    // Pass the Asteroids-specific trail length to the engine's generic system
    super(trailMaxLength);
  }
}
