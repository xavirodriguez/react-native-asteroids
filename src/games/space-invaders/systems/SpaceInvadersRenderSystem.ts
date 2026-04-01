import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import { HealthComponent, RenderComponent } from "../../../engine/types/EngineTypes";

/**
 * System that handles specific render updates for Space Invaders.
 */
export class SpaceInvadersRenderSystem extends System {
  public update(world: World, deltaTime: number): void {
    const renders = world.query("Render");

    renders.forEach(entity => {
      const render = world.getComponent<RenderComponent>(entity, "Render");
      const health = world.getComponent<HealthComponent>(entity, "Health");

      if (render) {
        // Handle invulnerability blinking
        if (health && health.invulnerableRemaining > 0) {
          health.invulnerableRemaining -= deltaTime;
          // Simple blink effect
          render.color = (Math.floor(health.invulnerableRemaining / 100) % 2 === 0)
            ? "transparent"
            : "#00FF00";
        } else if (health && health.invulnerableRemaining <= 0 && render.shape === "player_ship") {
          render.color = "#00FF00";
        }
      }
    });
  }
}
