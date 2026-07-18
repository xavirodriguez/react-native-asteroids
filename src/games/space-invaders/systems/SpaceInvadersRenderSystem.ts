import { System, World } from "@tiny-aster/core";
import { SpaceInvadersComponentRegistry } from "../types/SpaceInvadersTypes";

/**
 * System that handles specific render updates for Space Invaders.
 */
export class SpaceInvadersRenderSystem extends System<SpaceInvadersComponentRegistry> {
  public update(world: World<SpaceInvadersComponentRegistry>, _deltaTime: number): void {
    const renders = world.query("Render");

    renders.forEach(entity => {
      const health = world.getComponent(entity, "Health");
      if (!health) return;

      // Handle invulnerability blinking
      if (health.invulnerableRemaining !== undefined && health.invulnerableRemaining > 0) {
        const remaining = health.invulnerableRemaining;

        // Manejar parpadeo de Render
        const render = world.getComponent(entity, "Render");
        if (render) {
          const newColor = (Math.floor(remaining / 100) % 2 === 0)
            ? "transparent"
            : "#00FF00";

          // Regla extra: verificar si el color cambió antes de mutar
          if (render.color !== newColor) {
            world.mutateComponent(entity, "Render", r => {
              r.color = newColor;
            });
          }
        }
      } else {
        const render = world.getComponent(entity, "Render");
        const defaultColor = "#00FF00";

        if (render && render.shape === "player_ship" && render.color !== defaultColor) {
          // Mutación segura mediante mutateComponent
          world.mutateComponent(entity, "Render", r => {
            r.color = defaultColor;
          });
        }
      }
    });
  }
}
