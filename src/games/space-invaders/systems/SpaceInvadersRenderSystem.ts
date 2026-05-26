import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import { HealthComponent, RenderComponent } from "../../../engine/types/EngineTypes";

/**
 * System that handles specific render updates for Space Invaders.
 */
export class SpaceInvadersRenderSystem extends System {
  public update(world: World, _deltaTime: number): void {
    const renders = world.query("Render");

    renders.forEach(entity => {
      const health = world.getComponent<HealthComponent>(entity, "Health");
      if (!health) return;

      // Handle invulnerability blinking
      if (health.invulnerableRemaining > 0) {
        const remaining = health.invulnerableRemaining;

        // Manejar parpadeo de Render
        const render = world.getComponent<RenderComponent>(entity, "Render");
        if (render) {
          const newColor = (Math.floor(remaining / 100) % 2 === 0)
            ? "transparent"
            : "#00FF00";

          // Regla extra: verificar si el color cambió antes de mutar
          if (render.color !== newColor) {
            world.mutateComponent<RenderComponent>(entity, "Render", r => {
              r.color = newColor;
            });
          }
        }
      } else {
        const render = world.getComponent<RenderComponent>(entity, "Render");
        const defaultColor = "#00FF00";

        if (render && render.shape === "player_ship" && render.color !== defaultColor) {
          // Mutación segura mediante mutateComponent
          world.mutateComponent<RenderComponent>(entity, "Render", r => {
            r.color = defaultColor;
          });
        }
      }
    });
  }
}
