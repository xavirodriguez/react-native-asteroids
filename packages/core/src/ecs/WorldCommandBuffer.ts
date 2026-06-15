import { World, BlueprintRegistryMap } from "./World";
import { ComponentRegistry, ComponentType } from "./Component";
import { BlueprintArgs } from "./BlueprintRegistry";

export interface Command<TComponents extends ComponentRegistry, TBlueprints extends BlueprintRegistryMap<TComponents>> {
  execute(world: World<TComponents, any, TBlueprints>): void;
}

/**
 * Buffer for deferring world modifications until the end of a frame.
 *
 * @remarks
 * Using the command buffer is the recommended way to modify the world
 * (removing entities, adding/removing components) from within systems.
 * This helps maintain a stable world state during system updates
 * and reduces issues with iterator invalidation during structural changes.
 */
export class WorldCommandBuffer<
  TComponents extends ComponentRegistry = any,
  TBlueprints extends BlueprintRegistryMap<TComponents> = any
> {
  private commands: Command<TComponents, TBlueprints>[] = [];

  /**
   * Schedules an entity to be spawned from a blueprint.
   */
  public spawnFromBlueprint<TId extends keyof TBlueprints & string>(
    blueprintId: TId,
    args: BlueprintArgs<TBlueprints, TId>
  ): void {
    this.commands.push({
      execute: (world) => {
        const entity = world.createEntity();
        const registry = world.getResource<any>("BlueprintRegistry");
        const blueprint = registry?.get(blueprintId);
        if (blueprint) {
          blueprint.spawn(world, entity, args);
        }
      }
    });
  }

  public addComponent<K extends ComponentType<TComponents>>(
    entity: number,
    component: TComponents[K]
  ): void {
    this.commands.push({
      execute: (world) => world.addComponent(entity, component)
    });
  }

  public removeComponent<K extends ComponentType<TComponents>>(
    entity: number,
    type: K
  ): void {
    this.commands.push({
      execute: (world) => world.removeComponent(entity, type)
    });
  }

  public removeEntity(entity: number): void {
    this.commands.push({
      execute: (world) => world.removeEntity(entity)
    });
  }

  /**
   * Executes all buffered commands on the provided world.
   *
   * @internal
   */
  public flush(world: World<TComponents, any, TBlueprints>): void {
    const commands = [...this.commands];
    this.commands = [];
    for (const command of commands) {
      command.execute(world);
    }
  }

  /**
   * @deprecated
   * Directly creating entities via the command buffer is not supported as it
   * cannot return a valid entity ID immediately.
   * Use {@link spawnFromBlueprint} if possible, or create entities directly in the world
   * if the ID is needed immediately.
   */
  public createEntity(): number {
      console.warn("WorldCommandBuffer.createEntity() is not recommended. Use spawnFromBlueprint if possible.");
      return -1;
  }
}
