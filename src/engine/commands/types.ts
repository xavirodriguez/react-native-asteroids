import { Component } from "../core/Component";
import { Entity } from "../core/Entity";

/**
 * Representa los tipos de acciones serializables soportadas por el sistema de comandos.
 */
export type CommandType = 'THRUST' | 'ROTATE_LEFT' | 'ROTATE_RIGHT' | 'FIRE' | 'HYPERSPACE';

/**
 * GameCommand: Un objeto de datos puro (POJO) que representa una intención de acción.
 * Diseñado para ser 100% serializable y compatible con rollback/netcode.
 */
export interface GameCommand {
  /** Discriminador del tipo de comando. */
  type: CommandType;
  /** ID de la entidad que debe ejecutar el comando. */
  entityId: Entity;
  /** Tick de la simulación en el que se originó el comando. */
  tick: number;
  /** Datos adicionales opcionales para parametrizar el comando (ej. intensidad). */
  payload?: Record<string, unknown>;
}

/**
 * Componente ECS que gestiona la cola de comandos pendientes para el tick actual
 * y mantiene un histórico para facilitar el rollback y la reconciliación.
 */
export interface CommandQueueComponent extends Component {
  type: "CommandQueue";
  /** Buffer de comandos a ser procesados en el frame actual. */
  pending: GameCommand[];
  /** Almacenamiento histórico indexado por tick para auditoría y replays. */
  history: Record<number, GameCommand[]>;
}

/**
 * Factory pura para la inicialización consistente del componente CommandQueue.
 */
export function createCommandQueueComponent(): CommandQueueComponent {
  return {
    type: "CommandQueue",
    pending: [],
    history: {}
  };
}
