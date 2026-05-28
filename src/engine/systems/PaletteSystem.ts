import { System } from "../core/System";
import { World } from "../core/World";
import { TagComponent, RenderComponent, CoreComponentRegistry } from "../core/CoreComponents";
import { ComponentRegistry } from "../core/Component";
import { EventRegistry } from "../core/EventBus";

/**
 * System that applies palette colors to entities based on their tags.
 */
export class PaletteSystem<
  TComponents extends ComponentRegistry = CoreComponentRegistry,
  TEvents extends EventRegistry = any
> extends System<TComponents, TEvents> {
  constructor(private paletteId: string) {
    super();
  }

  public update(world: World<TComponents, TEvents, any>, _deltaTime: number): void {
    const query = world.query("Tag" as any, "Render" as any);

    // In a real implementation, we would look up the palette by ID
    // For now, using a simplified logic
    for (const entity of query) {
      const tags = world.getComponent(entity, "Tag" as any) as any as TagComponent;
      if (!tags) continue;

      let color = "#FFFFFF"; // Default
      if (tags.tags.includes("player")) color = "#00FF00";
      else if (tags.tags.includes("enemy")) color = "#FF0000";

      if (color) {
        world.mutateComponent(entity, "Render" as any, (r: any) => {
          (r as RenderComponent).color = color;
        });
      }
    }
  }
}
