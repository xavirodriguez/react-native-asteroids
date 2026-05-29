import { Entity, Component } from "../types/EngineTypes";
import { AnyCoreComponent, ComponentOf } from "./CoreComponents";
import type { World } from "./World";
import { BlueprintOverrides } from "../../data/blueprints/types/BlueprintTypes";
import { EntityBlueprintAssembler } from "../../factories/EntityBlueprintAssembler";

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

type Command =
  | { type: CommandType.CREATE_ENTITY, entity?: Entity, callback?: (entity: Entity) => void }
  | { type: CommandType.REMOVE_ENTITY, entity: Entity }
  | { type: CommandType.ADD_COMPONENT, entity: Entity, component: Component }
  | { type: CommandType.REMOVE_COMPONENT, entity: Entity, componentType: string }
  | { type: CommandType.MUTATE_COMPONENT, entity: Entity, componentType: string, mutator: (component: Component) => void }
  | { type: CommandType.SPAWN_FROM_BLUEPRINT, blueprintId: string, x: number, y: number, overrides?: BlueprintOverrides };

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
export class WorldCommandBuffer {
  private commands: Command[] = [];

  /**
   * Records the creation of a new entity.
   * @param entityOrCallback - Reserved ID or creation callback.
   * @param callback - Optional function receiving the created entity after flush.
   */
  public createEntity(entityOrCallback?: Entity | ((entity: Entity) => void), callback?: (entity: Entity) => void): void {
    if (typeof entityOrCallback === "function") {
      this.commands.push({ type: CommandType.CREATE_ENTITY, entity: undefined, callback: entityOrCallback });
    } else {
      this.commands.push({ type: CommandType.CREATE_ENTITY, entity: entityOrCallback, callback });
    }
  }

  /**
   * Records the removal of an entity.
   * @param entity - ID of the entity to remove.
   */
  public removeEntity(entity: Entity): void {
    this.commands.push({ type: CommandType.REMOVE_ENTITY, entity });
  }

  /**
   * Records the addition or replacement of a component on an entity.
   * @param entity - ID of the entity.
   * @param component - Component instance.
   */
  public addComponent(entity: Entity, component: Component): void {
    this.commands.push({ type: CommandType.ADD_COMPONENT, entity, component });
  }

  /**
   * Records the removal of a component from an entity.
   * @param entity - ID of the entity.
   * @param componentType - Name of the component type.
   */
  public removeComponent(entity: Entity, componentType: string): void {
    this.commands.push({ type: CommandType.REMOVE_COMPONENT, entity, componentType });
  }

  /**
   * Records a mutation for a component.
   * @param entity - ID of the entity.
   * @param componentType - Component type.
   * @param mutator - Mutation function.
   */
  public mutateComponent<TType extends AnyCoreComponent["type"]>(entity: Entity, componentType: TType, mutator: (component: ComponentOf<TType>) => void): void;
  public mutateComponent<T extends Component>(entity: Entity, componentType: string, mutator: (component: T) => void): void;
  public mutateComponent<T extends Component>(entity: Entity, componentType: string, mutator: (component: T) => void): void {
    this.commands.push({ type: CommandType.MUTATE_COMPONENT, entity, componentType, mutator: mutator as (component: Component) => void });
  }

  /**
   * Queues the creation of an entity from a blueprint.
   */
  public spawnFromBlueprint(blueprintId: string, x: number, y: number, overrides?: BlueprintOverrides): void {
    this.commands.push({ type: CommandType.SPAWN_FROM_BLUEPRINT, blueprintId, x, y, overrides });
  }

  /**
   * Attempts to apply all recorded commands to the provided world and clears the buffer.
   *
   * @remarks
   * Commands are processed sequentially in the order they were recorded.
   *
   * @param world - The world instance to apply changes to.
   */
  public flush(world: World): void {
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
            world.removeComponent(command.entity, command.componentType);
            break;
          case CommandType.MUTATE_COMPONENT:
            world.mutateComponent(command.entity, command.componentType, command.mutator);
            break;
          case CommandType.SPAWN_FROM_BLUEPRINT:
            EntityBlueprintAssembler.assemble(world, command.blueprintId, command.x, command.y, command.overrides, this);
            break;
        }
      }
    }
  }

  /**
   * Returns whether the buffer contains pending commands.
   */
  public get isEmpty(): boolean {
    return this.commands.length === 0;
  }

  /**
   * Clears the command buffer without executing the commands.
   */
  public clear(): void {
    this.commands = [];
  }
}
