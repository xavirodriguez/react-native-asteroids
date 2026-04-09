import { System } from "../core/System";
import { World } from "../core/World";
import { RenderComponent, TagComponent } from "../types/EngineTypes";
import { PALETTES } from "../../services/PaletteService";

/**
 * System to apply the active palette to entities based on their tags.
 */
export class PaletteSystem extends System {
  constructor(private activePaletteId: string) {
    super();
  }

  public update(world: World, deltaTime: number): void {
    const palette = PALETTES[this.activePaletteId] || PALETTES.palette_default;
    const entities = world.query("Render", "Tag");

    entities.forEach(entity => {
      const render = world.getComponent<RenderComponent>(entity, "Render");
      const tag = world.getComponent<TagComponent>(entity, "Tag");

      if (render && tag) {
        if (tag.tags.includes("LocalPlayer")) {
          render.color = palette.primary;
        } else if (tag.tags.includes("Enemy")) {
          render.color = palette.secondary;
        } else if (tag.tags.includes("Bullet") || tag.tags.includes("Projectile")) {
          render.color = palette.accent;
        }
      }
    });
  }
}
