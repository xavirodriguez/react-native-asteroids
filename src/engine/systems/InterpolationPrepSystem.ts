import { System } from "../core/System";
import { World } from "../core/World";
import { TransformComponent, PreviousTransformComponent } from "../core/CoreComponents";

/**
 * Sistema que captura el estado de transformación actual antes de que sea modificado por la simulación.
 *
 * @responsibility Almacenar la posición y rotación del tick anterior en {@link PreviousTransformComponent}.
 * @queries Transform
 * @mutates PreviousTransform
 * @executionOrder Fase: Input o Simulation (al inicio). Debe ejecutarse antes de cualquier sistema que mueva entidades.
 *
 * @remarks
 * Este sistema es fundamental para el renderizado suave. Los datos capturados aquí son utilizados
 * por los renderizadores (Canvas/Skia) para interpolar posiciones entre ticks físicos fijos.
 */
export class InterpolationPrepSystem extends System {
  public update(world: World, _deltaTime: number): void {
    const entities = world.query("Transform");

    entities.forEach(entity => {
      const transform = world.getComponent<TransformComponent>(entity, "Transform")!;
      let prev = world.getComponent<PreviousTransformComponent>(entity, "PreviousTransform");

      if (!prev) {
        prev = {
          type: "PreviousTransform",
          x: transform.x,
          y: transform.y,
          rotation: transform.rotation
        };
        world.addComponent(entity, prev);
      } else {
        prev.x = transform.x;
        prev.y = transform.y;
        prev.rotation = transform.rotation;
      }
    });
  }
}
