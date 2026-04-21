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
 * @responsibility Garantizar la seguridad de los iteradores durante la actualización de sistemas.
 *
 * @remarks
 * El uso del CommandBuffer es fundamental para evitar la invalidación de iteradores durante
 * la ejecución de sistemas (error "Iterator Invalidation"). Los cambios grabados no son
 * visibles en el mundo hasta que se llama explícitamente a {@link WorldCommandBuffer.flush}
 * (normalmente invocado por {@link World.flush} al final del tick).
 *
 * @conceptualRisk [STALE_QUERY_RESULTS][LOW] Las entidades creadas o componentes añadidos al
 * buffer no aparecerán en las consultas (`world.query`) hasta que se realice el flush.
 */
export class WorldCommandBuffer {
  private commands: Command[] = [];

  /**
   * Graba la creación de una nueva entidad para su ejecución diferida.
   *
   * @param callback - Función opcional que recibe el ID de la entidad creada tras el flush.
   *
   * @remarks Utilizado para spawnear proyectiles o partículas durante la actualización de sistemas.
   * @postcondition El comando se añade a la cola interna.
   */
  public createEntity(callback?: (entity: Entity) => void): void {
    this.commands.push({ type: "createEntity", callback });
  }

  /**
   * Graba la eliminación de una entidad para su ejecución diferida.
   *
   * @param entity - ID de la entidad a destruir.
   *
   * @remarks Es la forma segura de destruir entidades que mueren por impacto o TTL.
   * @postcondition El comando se añade a la cola interna.
   */
  public removeEntity(entity: Entity): void {
    this.commands.push({ type: "removeEntity", entity });
  }

  /**
   * Graba la adición o reemplazo de un componente en una entidad.
   *
   * @param entity - ID de la entidad destino.
   * @param component - La instancia del componente a añadir.
   *
   * @remarks Útil para añadir estados temporales (ej: Invulnerabilidad) sin romper bucles.
   * @postcondition El comando se añade a la cola interna.
   */
  public addComponent(entity: Entity, component: Component): void {
    this.commands.push({ type: "addComponent", entity, component });
  }

  /**
   * Graba la eliminación de un componente de una entidad.
   *
   * @param entity - ID de la entidad destino.
   * @param componentType - Nombre discriminador del componente.
   *
   * @postcondition El comando se añade a la cola interna.
   */
  public removeComponent(entity: Entity, componentType: string): void {
    this.commands.push({ type: "removeComponent", entity, componentType });
  }

  /**
   * Aplica de forma atómica todos los comandos grabados sobre el mundo y limpia el buffer.
   *
   * @remarks
   * Este método soporta flushes recursivos: si la ejecución de un comando (ej: a través del
   * callback de `createEntity`) añade nuevos comandos al buffer, estos se procesarán en
   * la misma llamada hasta que el buffer quede vacío.
   *
   * @param world - La instancia del {@link World} sobre la que aplicar los cambios.
   *
   * @precondition El mundo debe estar en un estado donde sea seguro realizar mutaciones.
   * @postcondition El buffer de comandos queda vacío.
   * @sideEffect Altera estructuralmente el mundo y sus índices de consultas.
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
