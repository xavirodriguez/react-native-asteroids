import { System } from "../core/System";
import { World } from "../core/World";
import { ScreenShakeComponent } from "../types/EngineTypes";

/**
 * Sistema encargado de gestionar el ciclo de vida de los efectos de sacudida de pantalla (Screen Shake).
 *
 * @responsibility Decrementar el temporizador de los componentes {@link ScreenShakeComponent}.
 * @responsibility Eliminar el componente una vez que el efecto ha expirado.
 * @queries ScreenShake
 * @mutates ScreenShake.remaining, World (component removal)
 * @dependsOn {@link RandomService} (vía Renderer)
 * @executionOrder Fase: Presentation. Se ejecuta antes del renderizado para que el renderer
 * lea el estado actualizado.
 *
 * @remarks
 * El sistema solo procesa la primera entidad que encuentra con el componente "ScreenShake".
 * La intensidad y el desplazamiento real son calculados por el {@link Renderer} utilizando
 * `RandomService.getInstance("render")` para evitar seed drift en la simulación.
 *
 * @conceptualRisk [SINGLETON_LIMITATION][LOW] El diseño actual asume que solo una entidad
 * (normalmente el GameState o la Cámara) tiene el control del Screen Shake global.
 */
export class ScreenShakeSystem extends System {
  /**
   * Updates screen shake timer.
   */
  public update(world: World, deltaTime: number): void {
    const shakeEntities = world.query("ScreenShake");

    for (let i = 0; i < shakeEntities.length; i++) {
      const entity = shakeEntities[i];
      const shake = world.getComponent<ScreenShakeComponent>(entity, "ScreenShake");
      if (!shake) continue;

      if (shake.remaining > 0) {
        shake.remaining -= deltaTime;
      } else {
        world.removeComponent(entity, "ScreenShake");
      }
    }
  }
}
