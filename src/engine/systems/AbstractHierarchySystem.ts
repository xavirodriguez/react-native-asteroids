import { System } from "../core/System";
import { World } from "../core/World";
import { Entity } from "../core/Entity";
import { IHierarchicalComponent } from "../core/CoreComponents";
import { ComponentRegistry } from "../core/Component";
import { EventRegistry } from "../core/EventBus";

/**
 * Base class for systems that process hierarchical data structures.
 *
 * Provides a unified iterative topological sort to ensure parents are processed
 * before their children, avoiding recursion and stack overflow risks.
 */
export abstract class AbstractHierarchySystem<
  TComponents extends ComponentRegistry = any,
  TEvents extends EventRegistry = any
> extends System<TComponents, TEvents> {
  /**
   * Tracks entities whose hierarchical state was updated in the current frame.
   * Used to propagate dirty state down the tree.
   */
  protected wasDirty = new Set<Entity>();

  /**
   * Generates a processing order where parents appear before their children.
   *
   * @param world - The ECS world instance.
   * @param componentType - The component discriminator that defines the hierarchy (e.g., "Transform", "UIElement").
   * @returns An array of entities in topological order.
   */
  protected getProcessingOrder(world: World<TComponents, TEvents, any>, componentType: string): Entity[] {
    const entities = world.query(componentType as any);
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

          const comp = world.getComponent(entity, componentType as any) as unknown as IHierarchicalComponent | undefined;
          if (comp && comp.parentEntity !== null) {
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
