import { Entity } from "./Entity";
import {
  ComponentRegistry,
  ComponentType,
  BlueprintRegistryMap
} from "./Component";
import { EventRegistry } from "./EventBus";
import type { World } from "./World";
import { BlueprintArgs } from "./BlueprintRegistry";

/**
 * Types of structural commands that can be deferred.
 */
export enum CommandType {
  CREATE_ENTITY = "createEntity",
  REMOVE_ENTITY = "removeEntity",
  ADD_COMPONENT = "addComponent",
  REMOVE_COMPONENT = "removeComponent",
  MUTATE_COMPONENT = "mutateComponent",
  SPAWN_FROM_BLUEPRINT = "spawnFromBlueprint"
}

type Command<TComponents extends ComponentRegistry, TEvents extends EventRegistry, TBlueprints extends BlueprintRegistryMap<TComponents>> =
  | { type: CommandType.CREATE_ENTITY, entity?: Entity, callback?: (entity: Entity) => void }
  | { type: CommandType.REMOVE_ENTITY, entity: Entity }
  | { type: CommandType.ADD_COMPONENT, entity: Entity, component: any }
  | { type: CommandType.REMOVE_COMPONENT, entity: Entity, componentType: string }
  | { type: CommandType.MUTATE_COMPONENT, entity: Entity, componentType: string, mutator: (component: any) => void }
  | { type: CommandType.SPAWN_FROM_BLUEPRINT, blueprintId: string, args: any };

/**
 * ECS Command Buffer - Defers structural world mutations to help ensure iterator safety.
 *
 * @remarks
 * The `WorldCommandBuffer` is designed for use when modifying the world during system
 * updates. Since systems often iterate over entities via queries, direct structural
 * modifications are restricted to help protect iterator safety and maintain results consistency.
 *
 * ### Execution Characteristics:
 * 1. **Sequential Execution**: Commands are processed in the order they were recorded (FIFO).
 * 2. **Deferred Visibility**: Structural changes are typically NOT reflected in the {@link World} until
 *    `flush()` is successfully called (usually at the end of the `World.update` cycle).
 *
 * Recommended practice:
 * - Systems should use `WorldCommandBuffer` for structural changes (entity creation/deletion,
 *   component addition/removal) during their `update` method.
 * - This helps prevent iterator invalidation and supports predictable state transitions.
 */
export class WorldCommandBuffer<
  TComponents extends ComponentRegistry = any,
  TEvents extends EventRegistry = any,
  TBlueprints extends BlueprintRegistryMap<TComponents> = any
> {
  private commands: Command<TComponents, TEvents, TBlueprints>[] = [];

  public createEntity(entityOrCallback?: Entity | ((entity: Entity) => void), callback?: (entity: Entity) => void): void {
    if (typeof entityOrCallback === "function") {
      this.commands.push({ type: CommandType.CREATE_ENTITY, entity: undefined, callback: entityOrCallback });
    } else {
      this.commands.push({ type: CommandType.CREATE_ENTITY, entity: entityOrCallback, callback });
    }
  }

  public removeEntity(entity: Entity): void {
    this.commands.push({ type: CommandType.REMOVE_ENTITY, entity });
  }

  public addComponent<K extends ComponentType<TComponents>>(entity: Entity, component: TComponents[K]): void {
    this.commands.push({ type: CommandType.ADD_COMPONENT, entity, component });
  }

  public removeComponent<K extends ComponentType<TComponents>>(entity: Entity, componentType: K): void {
    this.commands.push({ type: CommandType.REMOVE_COMPONENT, entity, componentType: componentType as string });
  }

  public mutateComponent<K extends ComponentType<TComponents>>(
    entity: Entity,
    componentType: K,
    mutator: (component: TComponents[K]) => void
  ): void {
    this.commands.push({ type: CommandType.MUTATE_COMPONENT, entity, componentType: componentType as string, mutator });
  }

  public spawnFromBlueprint<TId extends keyof TBlueprints & string>(
    blueprintId: TId,
    args: BlueprintArgs<TBlueprints, TId>
  ): void {
    this.commands.push({ type: CommandType.SPAWN_FROM_BLUEPRINT, blueprintId, args });
  }

  public flush(world: World<TComponents, TEvents, TBlueprints>): void {
    while (this.commands.length > 0) {
      const currentCommands = this.commands;
      this.commands = [];

      for (let i = 0; i < currentCommands.length; i++) {
        const command = currentCommands[i];
        switch (command.type) {
          case CommandType.CREATE_ENTITY: {
            const entity = world.createEntity(command.entity);
            if (command.callback) command.callback(entity);
            break;
          }
          case CommandType.REMOVE_ENTITY:
            world.removeEntity(command.entity);
            break;
          case CommandType.ADD_COMPONENT:
            world.addComponent(command.entity, command.component);
            break;
          case CommandType.REMOVE_COMPONENT:
            world.removeComponent(command.entity, command.componentType as any);
            break;
          case CommandType.MUTATE_COMPONENT:
            world.mutateComponent(command.entity, command.componentType as any, command.mutator);
            break;
          case CommandType.SPAWN_FROM_BLUEPRINT:
            world.spawnFromBlueprint(command.blueprintId as any, command.args);
            break;
        }
      }
    }
  }

  public get isEmpty(): boolean {
    return this.commands.length === 0;
  }

  public clear(): void {
    this.commands = [];
  }
}
