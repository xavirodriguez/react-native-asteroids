import { Entity, Component } from "../types/EngineTypes";
import { AnyCoreComponent, ComponentOf } from "./CoreComponents";
import type { World } from "./World";

/**
 * Tipos de comandos estructurales que pueden ser diferidos.
 */
export enum CommandType {
  CREATE_ENTITY = "createEntity",
  REMOVE_ENTITY = "removeEntity",
  ADD_COMPONENT = "addComponent",
  REMOVE_COMPONENT = "removeComponent",
  MUTATE_COMPONENT = "mutateComponent"
}

type Command =
  | { type: CommandType.CREATE_ENTITY, entity?: Entity, callback?: (entity: Entity) => void }
  | { type: CommandType.REMOVE_ENTITY, entity: Entity }
  | { type: CommandType.ADD_COMPONENT, entity: Entity, component: Component }
  | { type: CommandType.REMOVE_COMPONENT, entity: Entity, componentType: string }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- La mutación es polimórfica sobre diferentes tipos de Component
  | { type: CommandType.MUTATE_COMPONENT, entity: Entity, componentType: string, mutator: (component: any) => void };

/**
 * Buffer de comandos para diferir mutaciones estructurales del mundo ECS.
 *
 * @responsibility Grabar operaciones de creación, eliminación y modificación de entidades/componentes.
 * @responsibility Ejecutar los comandos grabados de forma secuencial sobre una instancia de {@link World}.
 *
 * @remarks
 * El uso del CommandBuffer es fundamental para evitar la invalidación de iteradores durante
 * la ejecución de sistemas. Los cambios grabados NO son visibles en el mundo (ni en las queries)
 * hasta que se llama a {@link World.flush} (generalmente al final del frame).
 */
export class WorldCommandBuffer {
  private commands: Command[] = [];

  /**
   * Graba la creación de una nueva entidad.
   * @param entityOrCallback - ID reservado por el Mundo o callback de creación.
   * @param callback - Función opcional que recibe la entidad creada tras el flush.
   */
  public createEntity(entityOrCallback?: Entity | ((entity: Entity) => void), callback?: (entity: Entity) => void): void {
    if (typeof entityOrCallback === "function") {
      this.commands.push({ type: CommandType.CREATE_ENTITY, entity: undefined, callback: entityOrCallback });
    } else {
      this.commands.push({ type: CommandType.CREATE_ENTITY, entity: entityOrCallback, callback });
    }
  }

  /**
   * Graba la eliminación de una entidad.
   * @param entity - ID de la entidad a eliminar.
   */
  public removeEntity(entity: Entity): void {
    this.commands.push({ type: CommandType.REMOVE_ENTITY, entity });
  }

  /**
   * Graba la adición o reemplazo de un componente en una entidad.
   * @param entity - ID de la entidad.
   * @param component - Instancia del componente.
   */
  public addComponent(entity: Entity, component: Component): void {
    this.commands.push({ type: CommandType.ADD_COMPONENT, entity, component });
  }

  /**
   * Graba la eliminación de un componente de una entidad.
   * @param entity - ID de la entidad.
   * @param componentType - Nombre del tipo de componente.
   */
  public removeComponent(entity: Entity, componentType: string): void {
    this.commands.push({ type: CommandType.REMOVE_COMPONENT, entity, componentType });
  }

  /**
   * Graba una mutación de un componente.
   * @param entity - ID de la entidad.
   * @param componentType - Tipo de componente.
   * @param mutator - Función de mutación.
   */
  public mutateComponent<TType extends AnyCoreComponent["type"]>(entity: Entity, componentType: TType, mutator: (component: ComponentOf<TType>) => void): void;
  public mutateComponent<T extends Component>(entity: Entity, componentType: string, mutator: (component: T) => void): void;
  public mutateComponent<T extends Component>(entity: Entity, componentType: string, mutator: (component: T) => void): void {
    this.commands.push({ type: CommandType.MUTATE_COMPONENT, entity, componentType, mutator });
  }

  /**
   * Aplica todos los comandos grabados sobre el mundo proporcionado y limpia el buffer.
   * @param world - La instancia del mundo sobre la que aplicar los cambios.
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
        }
      }
    }
  }

  /**
   * Devuelve si el buffer contiene comandos pendientes.
   */
  public get isEmpty(): boolean {
    return this.commands.length === 0;
  }

  /**
   * Limpia el buffer de comandos sin ejecutarlos.
   */
  public clear(): void {
    this.commands = [];
  }
}
