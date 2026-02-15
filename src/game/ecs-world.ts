import type { Component, ComponentType, Entity } from "../types/GameTypes"

/**
 * Base class for all game systems.
 * Systems implement game logic by processing entities with specific sets of components.
 */
export abstract class System {
  /**
   * Updates the system logic for a single frame.
   *
   * @param world - The ECS world containing entities and components.
   * @param deltaTime - The time elapsed since the last frame in milliseconds.
   */
  abstract update(world: World, deltaTime: number): void
}

/**
 * ECS World class that manages the lifecycle of entities, components, and systems.
 *
 * @remarks
 * The World is the central container for the ECS architecture:
 * - **Entities**: Unique numerical IDs.
 * - **Components**: Data structures attached to entities, grouped by type.
 * - **Systems**: Logic that operates on entities that have a specific combination of components.
 *
 * Performance note: Component queries are currently performed by filtering all entities,
 * which is $O(N)$ where $N$ is the number of entities.
 *
 * @example
 * ```typescript
 * const world = new World();
 * const entity = world.createEntity();
 * world.addComponent(entity, { type: "Position", x: 0, y: 0 });
 * world.addSystem(new MovementSystem());
 * world.update(16.67);
 * ```
 */
export class World {
  private entities = new Set<Entity>()
  private components = new Map<ComponentType, Map<Entity, Component>>()
  private systems: System[] = []
  private nextEntityId = 1

  /**
   * Creates a new unique entity.
   *
   * @returns The newly created entity ID.
   */
  createEntity(): Entity {
    const id = this.nextEntityId++
    this.entities.add(id)
    return id
  }

  /**
   * Attaches a component to an entity.
   * If the entity already has a component of this type, it will be overwritten.
   *
   * @param entity - The entity to attach the component to.
   * @param component - The component instance to attach.
   * @typeParam T - The specific component type, must extend {@link Component}.
   */
  addComponent<T extends Component>(entity: Entity, component: T): void {
    const type = component.type
    if (!this.components.has(type)) {
      this.components.set(type, new Map())
    }
    this.components.get(type)!.set(entity, component)
  }

  /**
   * Retrieves a component of a specific type from an entity.
   *
   * @param entity - The entity to get the component from.
   * @param type - The type of the component to retrieve.
   * @returns The component instance if found, otherwise `undefined`.
   * @typeParam T - The expected component type.
   */
  getComponent<T extends Component>(entity: Entity, type: ComponentType): T | undefined {
    return this.components.get(type)?.get(entity) as T
  }

  /**
   * Removes a component of a specific type from an entity.
   *
   * @param entity - The entity to remove the component from.
   * @param type - The type of the component to remove.
   */
  removeComponent(entity: Entity, type: ComponentType): void {
    this.components.get(type)?.delete(entity)
  }

  /**
   * Queries entities that possess all of the specified component types.
   *
   * @param componentTypes - One or more component types to filter by.
   * @returns An array of entity IDs that have all the required components.
   */
  query(...componentTypes: ComponentType[]): Entity[] {
    return Array.from(this.entities).filter((entity) =>
      componentTypes.every((type) => this.components.get(type)?.has(entity)),
    )
  }

  /**
   * Removes an entity and all of its attached components from the world.
   *
   * @param entity - The entity to remove.
   */
  removeEntity(entity: Entity): void {
    this.components.forEach((componentMap) => {
      componentMap.delete(entity)
    })
    this.entities.delete(entity)
  }

  /**
   * Registers a system to be updated by the world.
   *
   * @param system - The system instance to add.
   */
  addSystem(system: System): void {
    this.systems.push(system)
  }

  /**
   * Updates all registered systems.
   *
   * @param deltaTime - Time elapsed since the last update in milliseconds.
   */
  update(deltaTime: number): void {
    this.systems.forEach((system) => system.update(this, deltaTime))
  }

  /**
   * Returns a list of all active entities in the world.
   *
   * @returns An array of all entity IDs.
   */
  getAllEntities(): Entity[] {
    return Array.from(this.entities)
  }
}
