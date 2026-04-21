import { System } from "../core/System";
import { World } from "../core/World";
import { TransformComponent, PreviousTransformComponent } from "../core/CoreComponents";

/**
 * Sistema responsable de capturar el estado de las transformaciones antes de la simulación.
 *
 * @responsibility Almacenar una copia del {@link TransformComponent} actual en
 * {@link PreviousTransformComponent} para su uso en la interpolación visual.
 *
 * @queries Transform
 * @mutates PreviousTransform
 *
 * @executionOrder
 * Fase: {@link SystemPhase.Input} (o Pre-Simulation).
 * Debe ejecutarse como el **primer paso absoluto** de cada tick de simulación (Fixed Update).
 *
 * @remarks
 * Este sistema es fundamental para garantizar un movimiento suave (60+ FPS visuales) en un motor
 * con lógica de tiempo fijo (Fixed Timestep). Al guardar el estado justo antes de que los
 * sistemas de física lo muten, permitimos que el renderer dibuje posiciones interpoladas.
 *
 * Implementa el soporte para jerarquías capturando tanto coordenadas locales como de mundo.
 *
 * @conceptualRisk [STALE_SNAPSHOT][LOW] Si este sistema no se ejecuta al inicio de cada tick,
 * la interpolación producirá jitter visual.
 */
export class InterpolationPrepSystem extends System {
  /**
   * Captura sincrónicamente el estado actual de todas las entidades que poseen un Transform.
   *
   * @param world - La instancia del mundo ECS.
   * @param _deltaTime - Tiempo transcurrido en el tick actual (ignorado).
   *
   * @precondition El sistema debe ejecutarse antes de cualquier mutación de posición (física).
   * @postcondition Todas las entidades con `Transform` tienen un `PreviousTransform` actualizado.
   * @postcondition Se capturan `x`, `y`, `rotation` y sus equivalentes `world*`.
   *
   * @sideEffect Crea el componente `PreviousTransform` si la entidad no lo posee.
   */
  public update(world: World, _deltaTime: number): void {
    const entities = world.query("Transform");

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const transform = world.getComponent<TransformComponent>(entity, "Transform")!;
      let prev = world.getComponent<PreviousTransformComponent>(entity, "PreviousTransform");

      if (!prev) {
        prev = {
          type: "PreviousTransform",
          x: transform.x,
          y: transform.y,
          rotation: transform.rotation,
          worldX: transform.worldX,
          worldY: transform.worldY,
          worldRotation: transform.worldRotation,
        };
        world.addComponent(entity, prev);
      } else {
        prev.x = transform.x;
        prev.y = transform.y;
        prev.rotation = transform.rotation;
        prev.worldX = transform.worldX;
        prev.worldY = transform.worldY;
        prev.worldRotation = transform.worldRotation;
      }
    }
  }
}
