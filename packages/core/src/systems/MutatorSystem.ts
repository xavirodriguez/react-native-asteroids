import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { ObjectEffectComponent } from "../ecs/CoreComponents";

export interface IMutator {
  id: string;
  apply: (config: any) => any;
}

/**
 * Sistema encargado de inyectar variaciones dinámicas en las reglas de juego (mutadores).
 * A diferencia de los cambios de configuración estáticos, este sistema puede modificar el comportamiento
 * de las entidades frame a frame basado en condiciones activas.
 *
 * @responsibility Aplicar lógica transitoria basada en mutadores seleccionados para la sesión.
 * @queries `ObjectEffect`, `Render`.
 * @mutates Entidades que coincidan con la lógica específica del mutador.
 * @dependsOn `MutatorConfig`.
 * @executionOrder Logic Phase.
 */
export class MutatorSystem extends System {
  /**
   * Crea una instancia del sistema de mutadores.
   *
   * @param activeMutators - Lista de mutadores que deben aplicarse en esta ejecución del motor.
   */
  constructor(private activeMutators: IMutator[]) {
    super();
  }

  /**
   * Ejecuta la lógica de los mutadores activos sobre las entidades del mundo.
   *
   * @param world - El estado actual del motor ECS.
   * @param deltaTime - El tiempo transcurrido en milisegundos.
   */
  public update(world: World, _deltaTime: number): void {
    // Ghost ObjectEffect: Manejar el temporizador de visibilidad
    const hasGhostObjectEffect = this.activeMutators.some(m => m.id === 'effect_timer');
    if (hasGhostObjectEffect) {
      const objects = world.query("ObjectEffect");
      objects.forEach(entity => {
        world.mutateComponent<ObjectEffectComponent>(entity, "ObjectEffect", object => {
          if (object.visibilityTimer !== undefined && object.visibilityTimer > 0) {
            // Decrease by deltaTime-based ticks (approx 60fps)
            const ticksToSub = Math.max(1, Math.round(_deltaTime / 16.66));
            object.visibilityTimer = Math.max(0, object.visibilityTimer - ticksToSub);
          }
        });
      });
    }
  }
}
