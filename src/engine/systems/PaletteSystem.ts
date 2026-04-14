import { System } from "../core/System";
import { World } from "../core/World";
import { RenderComponent, TagComponent } from "../types/EngineTypes";
import { PALETTES } from "../../services/PaletteService";

/**
 * Sistema para aplicar la paleta de colores activa a las entidades según sus etiquetas (tags).
 *
 * @responsibility Sincronizar los colores de los componentes `Render` con la paleta global.
 * @responsibility Reaccionar a cambios en la paleta activa durante la ejecución.
 *
 * @remarks
 * Este sistema permite desacoplar la lógica visual de la lógica de juego, permitiendo
 * mutadores de color o modos daltónicos sin cambiar los prefabs de las entidades.
 *
 * @queries Render, Tag
 * @executionOrder Fase de Presentación (Presentation Phase).
 *
 * @invariant No debe modificar el estado del juego, solo el color en el componente Render.
 * @conceptualRisk [TAG_DEPENDENCY] Si una entidad tiene múltiples tags (ej: LocalPlayer y Enemy),
 * el orden de prioridad actual es fijo y podría causar confusión visual.
 */
export class PaletteSystem extends System {
  constructor(private activePaletteId: string) {
    super();
  }

  public update(world: World, _deltaTime: number): void {
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
