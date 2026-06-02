import { World, BlueprintRegistryMap, BlueprintDefinition } from "./World";
import { BlueprintRegistry } from "./BlueprintRegistry";
import { ComponentRegistry } from "./Component";
import { Entity } from "./Entity";

export type BlueprintArgs<TBlueprints, TId extends keyof TBlueprints> =
  TBlueprints[TId] extends BlueprintDefinition<any, infer TArgs>
    ? TArgs
    : never;

/**
 * @internal
 */
interface Command<TComponents extends ComponentRegistry, TBlueprints extends BlueprintRegistryMap<TComponents>> {
  execute(world: World<TComponents, Record<string, any>, TBlueprints>): void;
}

/**
 * Buffer for queuing structural changes to the ECS world.
 *
 * @remarks
 * Modifications to the world structure (creating entities, adding components) are
 * often deferred during the update cycle to help preserve iterator safety and maintain
 * result consistency. This command buffer allows systems to request these
 * changes for execution at a controlled point in the simulation lifecycle.
 */
export class WorldCommandBuffer<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
> {
  private commands: Command<TComponents, TBlueprints>[] = [];

  /**
   * Queues an entity to be spawned from a blueprint.
   */
  spawnFromBlueprint<TId extends keyof TBlueprints & string>(
    blueprintId: TId,
    args: BlueprintArgs<TBlueprints, TId>
  ): void {
    this.commands.push({
      execute: (world) => {
        const entity = world.createEntity();
        const registry = world.getResource<BlueprintRegistry<TComponents, TBlueprints>>("BlueprintRegistry");
        const blueprint = registry?.get(blueprintId);
        if (blueprint) {
          blueprint.spawn(world, entity, args);
        }
      }
    });
  }

  /**
   * Executes all buffered commands in the provided world.
   */
  flush(world: World<TComponents, Record<string, any>, TBlueprints>): void {
    const cmds = [...this.commands];
    this.commands = [];
    cmds.forEach(cmd => cmd.execute(world));
  }

  clear(): void {
    this.commands = [];
  }
}
