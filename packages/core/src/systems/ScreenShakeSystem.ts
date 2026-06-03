import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { ScreenShakeComponent } from "../ecs/CoreComponents";

/**
 * Sistema encargado de gestionar el ciclo de vida de los efectos de sacudida de pantalla (Screen Shake).
 *
 * @responsibility Decrementar el temporizador de los componentes {@link ScreenShakeComponent}.
 * @responsibility Eliminar el componente una vez que el efecto ha expirado.
 *
 * @public
 */
export class ScreenShakeSystem extends System {
  /**
   * Updates screen shake timers for all active shake sources.
   */
  public update(world: World, deltaTime: number): void {
    const shakeEntities = world.query("ScreenShake");

    for (let i = 0; i < shakeEntities.length; i++) {
      const entity = shakeEntities[i];
      let expired = false;

      world.mutateComponent<ScreenShakeComponent>(entity, "ScreenShake", (shake) => {
        if (shake.remaining > 0) {
            shake.remaining -= deltaTime;
        }
        expired = shake.remaining <= 0;
      });

      if (expired) {
        world.getCommandBuffer().removeComponent(entity, "ScreenShake");
      }
    }
  }
}
