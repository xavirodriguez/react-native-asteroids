import { System } from "../core/System";
import { World } from "../core/World";
import { ScreenShakeComponent } from "../types/EngineTypes";

/**
 * Sistema genérico de sacudida de pantalla (Screen Shake).
 * Gestiona el temporizador de cuenta atrás para el efecto visual.
 *
 * @responsibility Decrementar el tiempo restante de la sacudida en cada frame.
 * @responsibility Eliminar el componente `ScreenShake` una vez que el tiempo expira.
 * @queries ScreenShake
 * @mutates ScreenShake, World (Component removal)
 * @executionOrder Fase: Presentation. Se ejecuta antes de los renderizadores.
 *
 * @conceptualRisk [SINGLETON_SHAKE][LOW] El sistema solo procesa la primera entidad
 * con `ScreenShake` encontrada. Múltiples sacudidas simultáneas no se acumulan automáticamente.
 */
export class ScreenShakeSystem extends System {
  /**
   * Actualiza el temporizador de la sacudida de pantalla.
   *
   * @param world - El mundo ECS.
   * @param deltaTime - Tiempo transcurrido en milisegundos.
   *
   * @invariant El tiempo restante nunca será negativo después de que expire.
   */
  public update(world: World, deltaTime: number): void {
    const shakeEntity = world.query("ScreenShake")[0];
    if (shakeEntity === undefined) return;

    const shake = world.getComponent<ScreenShakeComponent>(shakeEntity, "ScreenShake");
    if (!shake) return;

    if (shake.remaining > 0) {
      shake.remaining -= deltaTime;
    } else {
      world.removeComponent(shakeEntity, "ScreenShake");
    }
  }
}
