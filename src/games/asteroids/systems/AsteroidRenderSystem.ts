import { World } from "../../../engine/core/World";
import { RenderUpdateSystem } from "../../../engine/systems/RenderUpdateSystem";
import { TransformComponent } from "../../../engine/types/EngineTypes";
import {
  type GameStateComponent,
  type ShipComponent,
  GAME_CONFIG,
} from "../../../types/GameTypes";

/**
 * System responsible for Asteroids-specific rendering logic (e.g., screen shake, ship trails).
 */
export class AsteroidRenderSystem extends RenderUpdateSystem {
  constructor() {
    super(GAME_CONFIG.TRAIL_MAX_LENGTH);
  }

  /**
   * Updates rendering-related state.
   */
  public override update(world: World, deltaTime: number): void {
    super.update(world, deltaTime);
    this.updateShipTrails(world);
  }

  private updateShipTrails(world: World): void {
    const entities = world.query("Transform", "Ship");
    entities.forEach((entity) => {
      const pos = world.getComponent<TransformComponent>(entity, "Transform");
      const shipComp = world.getComponent<ShipComponent>(entity, "Ship");

      if (pos && shipComp) {
        if (!shipComp.trailPositions) {
            shipComp.trailPositions = [];
        }

        shipComp.trailPositions.push({ x: pos.x, y: pos.y });

        if (shipComp.trailPositions.length > 12) {
          shipComp.trailPositions.shift();
        }
      }
    });
  }

}
