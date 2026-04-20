import { Entity, Component } from "../types/EngineTypes";
import type { World } from "./World";

type Command =
  | { type: "createEntity", callback?: (entity: Entity) => void }
  | { type: "removeEntity", entity: Entity }
  | { type: "addComponent", entity: Entity, component: Component }
  | { type: "removeComponent", entity: Entity, componentType: string };

/**
 * Buffer de comandos para diferir mutaciones estructurales del mundo ECS.
 *
 * @responsibility Grabar operaciones de creación, eliminación y modificación de entidades/componentes.
 * @responsibility Ejecutar los comandos grabados de forma secuencial sobre una instancia de {@link World}.
 *
 * @remarks
 * El uso del CommandBuffer es fundamental para evitar la invalidación de iteradores durante
 * la ejecución de sistemas. Los cambios grabados no son visibles en el mundo hasta que
 * se llama a {@link World.flush}.
 */
export class WorldCommandBuffer {
  private commands: Command[] = [];

  /**
   * Graba la creación de una nueva entidad.
   * @param callback - Función opcional que recibe la entidad creada tras el flush.
   */
  public createEntity(callback?: (entity: Entity) => void): void {
    this.commands.push({ type: "createEntity", callback });
  }

  /**
   * Graba la eliminación de una entidad.
   * @param entity - ID de la entidad a eliminar.
   */
  public removeEntity(entity: Entity): void {
    this.commands.push({ type: "removeEntity", entity });
  }

  /**
   * Graba la adición o reemplazo de un componente en una entidad.
   * @param entity - ID de la entidad.
   * @param component - Instancia del componente.
   */
  public addComponent(entity: Entity, component: Component): void {
    this.commands.push({ type: "addComponent", entity, component });
  }

  /**
   * Graba la eliminación de un componente de una entidad.
   * @param entity - ID de la entidad.
   * @param componentType - Nombre del tipo de componente.
   */
  public removeComponent(entity: Entity, componentType: string): void {
    this.commands.push({ type: "removeComponent", entity, componentType });
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
          case "createEntity": {
            const entity = world.createEntity();
            if (command.callback) command.callback(entity);
            break;
          }
          case "removeEntity":
            world.removeEntity(command.entity);
            break;
          case "addComponent":
            world.addComponent(command.entity, command.component);
            break;
          case "removeComponent":
            world.removeComponent(command.entity, command.componentType);
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
