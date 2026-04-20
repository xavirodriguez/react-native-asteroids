import { Entity, Component } from "../types/EngineTypes";

export enum CommandType {
  CREATE_ENTITY,
  REMOVE_ENTITY,
  ADD_COMPONENT,
  REMOVE_COMPONENT,
}

export type Command =
  | { type: CommandType.CREATE_ENTITY; entity: Entity }
  | { type: CommandType.REMOVE_ENTITY; entity: Entity }
  | { type: CommandType.ADD_COMPONENT; entity: Entity; component: Component }
  | { type: CommandType.REMOVE_COMPONENT; entity: Entity; componentType: string };

/**
 * Buffer for deferred structural changes to the World.
 *
 * @responsibility Record entity and component mutations to be applied at a safe time.
 * @internal Used by World to prevent structural changes during system iteration.
 */
export class WorldCommandBuffer {
  private queue: Command[] = [];

  /**
   * Adds a command to the queue.
   */
  public push(command: Command): void {
    this.queue.push(command);
  }

  /**
   * Returns and clears the current command queue.
   */
  public consume(): Command[] {
    const current = this.queue;
    this.queue = [];
    return current;
  }

  /**
   * Returns true if there are pending commands.
   */
  public get isEmpty(): boolean {
    return this.queue.length === 0;
  }
}
