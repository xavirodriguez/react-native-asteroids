import { World } from "@tiny-aster/core";
import { System } from "@tiny-aster/core";
import { InputStateComponent } from "@tiny-aster/core";
import { CommandQueueComponent, GameCommand, CommandType } from "../types";

/**
 * CommandMapperSystem: Responsable de la Capa de Mapeo de Entradas.
 * Traduce el estado semántico del InputState (ej. 'FORWARD') a comandos serializables
 * dentro de la cola de comandos de las entidades interesadas.
 */
export class CommandMapperSystem extends System {
  /**
   * Mapa de traducción de acciones de entrada a tipos de comando lógicos.
   */
  private static readonly ACTION_MAP: Record<string, CommandType> = {
    'FORWARD': 'THRUST',
    'LEFT': 'ROTATE_LEFT',
    'RIGHT': 'ROTATE_RIGHT',
    'FIRE': 'FIRE',
    'HYPERSPACE': 'HYPERSPACE',
  };

  /**
   * Procesa la entrada unificada y genera comandos planos para el tick actual.
   *
   * @param world - Instancia del mundo ECS.
   * @param _deltaTime - Tiempo transcurrido (no se usa en el mapeo puro).
   */
  public update(world: World, _deltaTime: number): void {
    // Obtenemos el singleton del estado de entrada
    const inputState = world.getSingleton<InputStateComponent>("InputState");
    if (!inputState) return;

    const currentTick = world.tick;
    const commandQueueEntities = world.query("CommandQueue");

    for (const entity of commandQueueEntities) {
      world.mutateComponent<CommandQueueComponent>(entity, "CommandQueue", (queue) => {
        // REGLA: Limpiar comandos pendientes del frame anterior antes de procesar el nuevo tick
        queue.pending = [];

        // Iterar sobre las acciones activas en el InputState
        for (const [action, isPressed] of inputState.actions.entries()) {
          if (isPressed) {
            const commandType = CommandMapperSystem.ACTION_MAP[action];

            if (commandType) {
              // Crear el comando como un POJO puro
              const command: GameCommand = {
                type: commandType,
                entityId: entity,
                tick: currentTick
              };

              // Insertar en la cola de ejecución inmediata
              queue.pending.push(command);

              // Registrar en el histórico indexado por tick para rollback/replays
              if (!queue.history[currentTick]) {
                queue.history[currentTick] = [];
              }
              queue.history[currentTick].push(command);
            }
          }
        }

        // Poda del histórico (Mantener últimos 1000 ticks para Rollback/GGPO)
        const PRUNE_WINDOW = 1000;
        if (currentTick > PRUNE_WINDOW) {
          delete queue.history[currentTick - PRUNE_WINDOW];
        }
      });
    }
  }
}
