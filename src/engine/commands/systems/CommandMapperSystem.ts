import { World } from "../../core/World";
import { System } from "../../core/System";
import { InputStateComponent } from "../../core/CoreComponents";
import { CommandQueueComponent, GameCommand, CommandType } from "../types";

/**
 * Sistema que lee el estado de entrada unificado y lo mapea a comandos serializables.
 * Se encarga de desacoplar los periféricos de entrada de la ejecución lógica.
 */
export class CommandMapperSystem extends System {
  /**
   * Mapeo de acciones de entrada a tipos de comandos.
   */
  private static readonly ACTION_MAP: Record<string, CommandType> = {
    'FORWARD': 'THRUST',
    'LEFT': 'ROTATE_LEFT',
    'RIGHT': 'ROTATE_RIGHT',
    'FIRE': 'FIRE',
    'HYPERSPACE': 'HYPERSPACE',
  };

  /**
   * Actualiza la cola de comandos de las entidades basándose en el estado de entrada actual.
   */
  public update(world: World, _deltaTime: number): void {
    const inputState = world.getSingleton<InputStateComponent>("InputState");
    if (!inputState) return;

    const entities = world.query("CommandQueue");
    const currentTick = world.tick;

    for (const entity of entities) {
      world.mutateComponent<CommandQueueComponent>(entity, "CommandQueue", (queue) => {
        // 1. Limpiar comandos pendientes del tick anterior
        queue.pending = [];

        // 2. Mapear acciones activas a nuevos comandos
        for (const [action, isPressed] of inputState.actions.entries()) {
          if (isPressed) {
            const commandType = CommandMapperSystem.ACTION_MAP[action];
            if (commandType) {
              const command: GameCommand = {
                type: commandType,
                entityId: entity,
                tick: currentTick
              };

              // 3. Insertar en cola de ejecución y en el histórico
              queue.pending.push(command);

              if (!queue.history[currentTick]) {
                queue.history[currentTick] = [];
              }
              queue.history[currentTick].push(command);
            }
          }
        }
      });
    }
  }
}
