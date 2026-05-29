import { System } from "../../core/System";
import { World } from "../../core/World";
import {
  InputStateComponent,
  CoreComponentRegistry
} from "../../core/CoreComponents";
import { CommandQueueComponent } from "../../commands/types";
import { ComponentRegistry } from "../../core/Component";
import { EventRegistry } from "../../core/EventBus";

/**
 * System that maps input actions to game commands.
 */
export class CommandMapperSystem<
  TComponents extends ComponentRegistry = CoreComponentRegistry,
  TEvents extends EventRegistry = any
> extends System<TComponents, TEvents> {
  public update(world: World<TComponents, TEvents, any>, _deltaTime: number): void {
    const input = world.getSingleton("InputState" as any) as any as InputStateComponent;
    if (!input) return;

    const query = world.query("CommandQueue" as any);
    for (const entity of query) {
        world.mutateComponent(entity, "CommandQueue" as any, (q: any) => {
            const queue = q as CommandQueueComponent;
            if (input.actions.get("thrust")) {
                queue.pending.push({
                    type: "THRUST" as any,
                    entityId: entity,
                    tick: world.tick
                });
            }
        });
    }
  }
}
