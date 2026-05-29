import { World, BlueprintRegistryMap, BlueprintDefinition } from "./World";
import { ComponentRegistry } from "./Component";
import { Entity } from "./Entity";

export type BlueprintArgs<TBlueprints, TId extends keyof TBlueprints> =
  TBlueprints[TId] extends BlueprintDefinition<any, infer TArgs>
    ? TArgs
    : never;

interface Command<TComponents extends ComponentRegistry, TBlueprints extends BlueprintRegistryMap<TComponents>> {
  execute(world: World<TComponents, any, TBlueprints>): void;
}

export class WorldCommandBuffer<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
> {
  private commands: Command<TComponents, TBlueprints>[] = [];

  spawnFromBlueprint<TId extends keyof TBlueprints & string>(
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

  flush(world: World<TComponents, any, TBlueprints>): void {
    const cmds = [...this.commands];
    this.commands = [];
    cmds.forEach(cmd => cmd.execute(world));
  }

  clear(): void {
    this.commands = [];
  }
}
