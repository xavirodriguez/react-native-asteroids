import { System } from "../core/System";
import { World } from "../core/World";
import { Mutator } from "../../config/MutatorConfig";
import { GenericComponent } from "../core/Component";

/**
 * Sistema encargado de inyectar variaciones dinámicas en las reglas de juego (mutadores).
 * A diferencia de los cambios de configuración estáticos, este sistema puede modificar el comportamiento
 * de las entidades frame a frame basado en condiciones activas.
 *
 * @responsibility Aplicar lógica transitoria basada en mutadores seleccionados para la sesión.
 * @queries `Ball`, `Render`.
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
  constructor(private activeMutators: Mutator[]) {
    super();
  }

  /**
   * Ejecuta la lógica de los mutadores activos sobre las entidades del mundo.
   *
   * @param world - El estado actual del motor ECS.
   * @param deltaTime - El tiempo transcurrido en milisegundos.
   */
  public update(world: World, _deltaTime: number): void {
    // Ghost Ball: Manejar el temporizador de visibilidad
    const hasGhostBall = this.activeMutators.some(m => m.id === 'ghost_ball');
    if (hasGhostBall) {
      const balls = world.query("Ball");
      balls.forEach(entity => {
        world.mutateComponent(entity, "Ball", ball => {
          if (ball.visibilityTimer !== undefined && ball.visibilityTimer > 0) {
            // Decrease by deltaTime-based ticks (approx 60fps)
            const ticksToSub = Math.max(1, Math.round(_deltaTime / 16.66));
            ball.visibilityTimer = Math.max(0, ball.visibilityTimer - ticksToSub);
          }
        });
      });
    }
  }
}
