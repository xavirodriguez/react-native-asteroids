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
      const health = world.getComponent<HealthComponent>(entity, "Health");

      // Handle invulnerability blinking
      if (health && health.invulnerableRemaining > 0) {
        const remaining = health.invulnerableRemaining - deltaTime;

        // Mutación segura mediante mutateComponent
        world.mutateComponent<HealthComponent>(entity, "Health", h => {
          h.invulnerableRemaining = remaining;
        });

        // Simple blink effect
        world.mutateComponent<RenderComponent>(entity, "Render", render => {
          render.color = (Math.floor(remaining / 100) % 2 === 0)
            ? "transparent"
            : "#00FF00";
        });
      } else if (health && health.invulnerableRemaining <= 0) {
        const render = world.getComponent<RenderComponent>(entity, "Render");
        if (render && render.shape === "player_ship" && render.color !== "#00FF00") {
          // Mutación segura mediante mutateComponent
          world.mutateComponent<RenderComponent>(entity, "Render", r => {
            r.color = "#00FF00";
          });
        }
      }
    });
  }
}
