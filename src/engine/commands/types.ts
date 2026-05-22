import { Component } from "../core/Component";
import { Entity } from "../core/Entity";

/**
 * Representa una acción serializable en el juego.
 */
export type CommandType = 'THRUST' | 'ROTATE_LEFT' | 'ROTATE_RIGHT' | 'FIRE' | 'HYPERSPACE';

export interface GameCommand {
  /** Tipo de acción. */
  type: CommandType;
  /** Entidad que originó o sobre la que actúa el comando. */
  entityId: Entity;
  /** Tick en el que se generó el comando. */
  tick: number;
  /** Datos variables opcionales. */
  payload?: Record<string, unknown>;
}

/**
 * Componente ECS que almacena la cola de comandos pendientes y el histórico.
 */
export interface CommandQueueComponent extends Component {
  type: "CommandQueue";
  /** Comandos pendientes de ejecutar en el tick actual. */
  pending: GameCommand[];
  /** Histórico de comandos indexado por número de tick. */
  history: Record<number, GameCommand[]>;
}

/**
 * Factoría pura para inicializar un CommandQueueComponent.
 */
export function createCommandQueueComponent(): CommandQueueComponent {
  return {
    type: "CommandQueue",
    pending: [],
    history: {}
  };
}
