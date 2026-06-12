import { ComponentRegistry, ComponentType } from "./Component";
import { Entity } from "./Entity";

/**
 * WorldCommandBuffer - Queues structural changes to be applied safely outside of system updates.
 *
 * @remarks
 * Using the command buffer is the recommended way to modify the world structure
 * (creating/removing entities or components) from within systems to avoid
 * invalidating iterators or causing inconsistent query results during an update.
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
   * Queues a component mutation.
   */
  mutateComponent<T>(entity: Entity, type: string, updater: (component: T) => void): void {
    this.addCommand(world => world.mutateComponent(entity, type, updater));
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
