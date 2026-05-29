import { System } from "../../core/System";
import { World } from "../../core/World";
import {
  TransformComponent,
  VelocityComponent,
  CoreComponentRegistry
} from "../../core/CoreComponents";
import { CommandQueueComponent } from "../../commands/types";
import { ComponentRegistry } from "../../core/Component";
import { EventRegistry } from "../../core/EventBus";

/**
 * System that processes command queues and applies them to entities.
 */
export class CommandInvokerSystem<
  TComponents extends ComponentRegistry = CoreComponentRegistry,
  TEvents extends EventRegistry = any
> extends System<TComponents, TEvents> {
  public update(world: World<TComponents, TEvents, any>, _deltaTime: number): void {
    const query = world.query("CommandQueue" as any);

    for (const entity of query) {
      const queue = world.getComponent(entity, "CommandQueue" as any) as any as CommandQueueComponent;
      if (!queue || queue.pending.length === 0) continue;

      for (const command of queue.pending) {
        this.applyCommand(world, entity, command);
      }

      world.mutateComponent(entity, "CommandQueue" as any, (q: any) => {
        (q as CommandQueueComponent).pending.length = 0;
      });
    }
  }

  private applyCommand(world: World<TComponents, TEvents, any>, entity: number, command: any): void {
    if (command.type === "ROTATE_LEFT") {
        world.mutateComponent(entity, "Transform" as any, (t: any) => {
            (t as TransformComponent).rotation -= 0.1;
            (t as TransformComponent).dirty = true;
        });
    }
  }
}
