import { World } from "../../../engine/core/World";
import { RenderUpdateSystem } from "../../../engine/systems/RenderUpdateSystem";
import { TransformComponent } from "../../../engine/types/EngineTypes";
import {
  type GameStateComponent,
  type ShipComponent,
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
    super(GAME_CONFIG.TRAIL_MAX_LENGTH);
  }
}
