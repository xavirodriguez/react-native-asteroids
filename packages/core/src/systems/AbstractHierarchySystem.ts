import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { Entity } from "../ecs/Entity";
import { IHierarchicalComponent, CoreComponentRegistry } from "../ecs/CoreComponents";
import { ComponentRegistry, ComponentType } from "../ecs/Component";
import { EventRegistry } from "../events/EventBus";

export abstract class AbstractHierarchySystem<
  TComponents extends ComponentRegistry = CoreComponentRegistry,
  TEvents extends EventRegistry = any
> extends System<TComponents, TEvents> {
  protected wasDirty = new Set<Entity>();

  protected getProcessingOrder(world: World<TComponents, TEvents>, componentType: ComponentType<TComponents>): Entity[] {
    const entities = world.query(componentType);
    if (entities.length === 0) return [];

    const order: Entity[] = [];
    const visited = new Set<Entity>();
    const processing = new Set<Entity>();
    const stack: { entity: Entity; stage: 'enter' | 'exit' }[] = [];

    for (let i = 0; i < entities.length; i++) {
      const startEntity = entities[i];
      if (visited.has(startEntity)) continue;

      stack.push({ entity: startEntity, stage: 'enter' });

      while (stack.length > 0) {
        const current = stack.pop()!;
        const { entity, stage } = current;

        if (stage === 'enter') {
          if (visited.has(entity)) continue;
          if (processing.has(entity)) {
            console.warn(`[${this.constructor.name}] Circular dependency detected at entity ${entity}.`);
            continue;
          }

          processing.add(entity);
          stack.push({ entity, stage: 'exit' });

          const comp = world.getComponent(entity, componentType) as unknown as IHierarchicalComponent | undefined;
          if (comp && comp.parentEntity !== undefined) {
            stack.push({ entity: comp.parentEntity, stage: 'enter' });
          }
        } else {
          processing.delete(entity);
          visited.add(entity);
          order.push(entity);
        }
      }
    }

    return order;
  }
}
