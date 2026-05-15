import { System } from "../core/System";
import { World } from "../core/World";
import { TransformComponent, PreviousTransformComponent } from "../core/CoreComponents";

/**
 * Sistema que intenta capturar el estado de transformación actual antes de ser modificado por la simulación.
 *
 * @responsibility Intentar almacenar la posición y rotación del tick anterior en {@link PreviousTransformComponent}.
 *
 * API status: Public
 */
export class InterpolationPrepSystem extends System {
  /**
   * Captura el estado actual del Transform en PreviousTransform.
   *
   * @param world - El mundo ECS.
   * @param _deltaTime - Tiempo transcurrido (ignorado).
   */
  public update(world: World, _deltaTime: number): void {
    const entities = world.query("Transform");

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const transform = world.getComponent<TransformComponent>(entity, "Transform")!;
      const prev = world.getComponent<PreviousTransformComponent>(entity, "PreviousTransform");

      if (!prev) {
        world.getCommandBuffer().addComponent(entity, {
          type: "PreviousTransform",
          x: transform.x,
          y: transform.y,
          rotation: transform.rotation,
          worldX: transform.worldX,
          worldY: transform.worldY,
          worldRotation: transform.worldRotation,
        } as PreviousTransformComponent);
      } else {
        world.mutateComponent<PreviousTransformComponent>(entity, "PreviousTransform", p => {
            p.x = transform.x;
            p.y = transform.y;
            p.rotation = transform.rotation;
            p.worldX = transform.worldX;
            p.worldY = transform.worldY;
            p.worldRotation = transform.worldRotation;
        });
      }
    }
  }
}
