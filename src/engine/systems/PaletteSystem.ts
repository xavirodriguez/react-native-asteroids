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
      const tag = world.getComponent<TagComponent>(entity, "Tag");
      if (!tag) return;

      const newColor = tag.tags.includes("LocalPlayer")
        ? palette.primary
        : tag.tags.includes("Enemy")
          ? palette.secondary
          : (tag.tags.includes("Bullet") || tag.tags.includes("Projectile"))
            ? palette.accent
            : null;

      if (newColor !== null) {
        world.mutateComponent<RenderComponent>(entity, "Render", (r) => {
          r.color = newColor;
        });
      }
    });
  }
}
