import { World, BlueprintRegistryMap } from "./World";
import { ComponentRegistry, ComponentType } from "./Component";
import { BlueprintArgs, BlueprintRegistry } from "./BlueprintRegistry";
import { EventRegistry } from "../events/EventBus";

export interface Command<
  TComponents extends ComponentRegistry,
  TEvents extends EventRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents>
> {
  execute(world: World<TComponents, TEvents, TBlueprints>): void;
}

/**
 * Buffer for deferring world modifications until the end of an update cycle.
 *
 * @remarks
 * Using the command buffer is the recommended way to modify the world
 * (e.g., spawning/removing entities, adding/removing components) from within systems.
 *
 * This approach is designed to help maintain a stable world state throughout the frame's update
 * phases and helps minimize issues like iterator invalidation or inconsistent
 * query results caused by mid-frame structural changes.
 *
 * @warning
 * **Deferred execution**: Commands are not executed immediately. Changes will only
 * be reflected in the world state after {@link WorldCommandBuffer.flush} is
 * called (typically at the end of the {@link World.update} cycle).
 */
export class WorldCommandBuffer<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
> {
  private commands: Command<TComponents, TEvents, TBlueprints>[] = [];

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
        const registry = world.getResource<BlueprintRegistry<TComponents, TEvents, TBlueprints>>("BlueprintRegistry");
        const blueprint = registry?.get(blueprintId);
        if (blueprint) {
          blueprint.spawn(world, entity, args);
        }
      }
    });
  }

  public addComponent<K extends ComponentType<TComponents>>(
    entity: number,
    component: TComponents[K] & { type: K }
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
   */
  public flush(world: World<TComponents, TEvents, TBlueprints>): void {
    const commands = [...this.commands];
    this.commands = [];
    for (const command of commands) {
      command.execute(world);
    }
  }

  /**
   * Schedules a specific entity ID to be activated in the world.
   *
   * @remarks
   * This is useful when an ID has been pre-reserved via {@link World.reserveEntityId}.
   */
  public createEntity(entity: number): void {
    this.commands.push({
      execute: (world) => {
        // Since the ID is already reserved, we just need to ensure it's marked as active.
        // If the ID was NOT reserved, this might cause issues if not careful.
        const w = world as unknown as { activeEntities: Set<number>, _structureVersion: number };
        w.activeEntities.add(entity);
        w._structureVersion++;
      }
    });
  }
}
