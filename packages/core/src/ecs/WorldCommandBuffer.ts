import { ComponentRegistry, ComponentType, ComponentOf } from "./Component";
import { Entity } from "./Entity";

/**
 * WorldCommandBuffer - Queues structural changes to be applied safely outside of system updates.
 */
export class WorldCommandBuffer<TComponents extends ComponentRegistry = ComponentRegistry> {
  private commands: ((world: any) => void)[] = [];

  /**
   * Adds a command to the buffer.
   */
  addCommand(command: (world: any) => void): void {
    this.commands.push(command);
  }

  /**
   * Queues an entity creation.
   */
  createEntity(): void {
    this.addCommand(world => world.createEntity());
  }

  /**
   * Queues an entity removal.
   */
  removeEntity(entity: Entity): void {
    this.addCommand(world => world.removeEntity(entity));
  }

  /**
   * Queues a component addition.
   */
  addComponent<K extends ComponentType<TComponents>>(entity: Entity, component: TComponents[K]): void {
    this.addCommand(world => world.addComponent(entity, component));
  }

  /**
   * Queues a component removal.
   */
  removeComponent(entity: Entity, type: string): void {
    this.addCommand(world => world.removeComponent(entity, type));
  }

  /**
   * Applies all queued commands to the world.
   */
  flush(world: any): void {
    const commands = this.commands;
    this.commands = [];
    for (let i = 0; i < commands.length; i++) {
      commands[i](world);
    }
  }

  /**
   * Clears all queued commands.
   */
  clear(): void {
    this.commands = [];
  }
}
