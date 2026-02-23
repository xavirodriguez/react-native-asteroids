import type { Component, ComponentType, Entity } from "../types/GameTypes"

/**
 * Base class for all game systems in the ECS architecture.
 * Systems implement the game logic by processing entities that possess specific sets of components.
 *
 * @remarks
 * All concrete systems must implement the {@link System.update} method.
 * Systems are executed sequentially by the {@link World} in the order they were added.
 */
export abstract class System {
  /**
   * Updates the system logic for a single frame.
   *
   * @param world - The ECS world containing entities and components.
   * @param deltaTime - The time elapsed since the last frame in milliseconds.
   *
   * @example
   * ```typescript
   * class MySystem extends System {
   *   update(world: World, deltaTime: number): void {
   *     const entities = world.query("Position");
   *     // logic here
   *   }
   * }
   * ```
   */
  abstract update(world: World, deltaTime: number): void
}

/**
 * ECS World class that manages the lifecycle of entities, components, and systems.
 *
 * @remarks
 * The World is the central container for the ECS architecture:
 * - **Entities**: Unique numerical IDs representing individual objects in the game.
 * - **Components**: Pure data structures attached to entities, grouped by type.
 * - **Systems**: Logic that operates on entities that have a specific combination of components.
 *
 * Performance note: Component queries are optimized via an internal index,
 * making them $O(M)$ where $M$ is the number of entities with the rarest component in the query.
 */
export class World {
  private entities = new Set<Entity>()
  private components = new Map<ComponentType, Map<Entity, Component>>()
  private componentIndex = new Map<ComponentType, Set<Entity>>()
  private systems: System[] = []
  private nextEntityId = 1
  /**
   * Current version of the world structure.
   * Incremented whenever an entity or component is added or removed.
   */
  public version = 0

  /**
   * Creates a new unique entity in the world.
   *
   * @returns The newly created {@link Entity} ID.
   */
  createEntity(): Entity {
    const id = this.nextEntityId++
    this.entities.add(id)
    this.version++
    return id
  }

  /**
   * Attaches a component to an entity.
   * If the entity already has a component of this type, it will be overwritten.
   *
   * @param entity - The entity to attach the component to.
   * @param component - The component instance to attach.
   */
  addComponent<T extends Component>(entity: Entity, component: T): void {
    const type = component.type

    // Ensure storage for this component type exists
    if (!this.components.has(type)) {
      this.components.set(type, new Map())
      this.componentIndex.set(type, new Set())
    }

    this.components.get(type)!.set(entity, component)
    this.componentIndex.get(type)!.add(entity)
    this.version++
  }

  /**
   * Retrieves a component of a specific type from an entity.
   *
   * @param entity - The entity to get the component from.
   * @param type - The type of the component to retrieve.
   * @returns The component instance if found, otherwise `undefined`.
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
    const componentMap = this.components.get(type)
    if (componentMap && componentMap.delete(entity)) {
      this.componentIndex.get(type)!.delete(entity)
      this.version++
    }
  }

  /**
   * Queries entities that possess all of the specified component types.
   *
   * @param componentTypes - One or more component types to filter by.
   * @returns An array of {@link Entity} IDs that have all the required components.
   *
   * @remarks
   * This method uses an internal index to quickly find candidates.
   */
  query(...componentTypes: ComponentType[]): Entity[] {
    if (componentTypes.length === 0) return []

    // Find the smallest set of entities for the given types to minimize checks
    const sortedTypes = [...componentTypes].sort((a, b) => {
      const countA = this.componentIndex.get(a)?.size ?? 0
      const countB = this.componentIndex.get(b)?.size ?? 0
      return countA - countB
    })

    const rarestType = sortedTypes[0]
    const entitiesWithRarestComponent = this.componentIndex.get(rarestType)

    if (!entitiesWithRarestComponent || entitiesWithRarestComponent.size === 0) {
      return []
    }

    return Array.from(entitiesWithRarestComponent).filter((entity) =>
      sortedTypes.slice(1).every((type) => this.componentIndex.get(type)?.has(entity)),
    )
  }

  /**
   * Removes an entity and all of its attached components from the world.
   *
   * @param entity - The entity to remove.
   */
  removeEntity(entity: Entity): void {
    this.components.forEach((componentMap, type) => {
      if (componentMap.delete(entity)) {
        this.componentIndex.get(type)!.delete(entity)
      }
    })

    if (this.entities.delete(entity)) {
      this.version++
    }
  }

  /**
   * Resets the entire world, removing all entities and components.
   * Systems remain registered.
   */
  clear(): void {
    this.entities.clear()
    this.components.clear()
    this.componentIndex.clear()
    this.version++
  }

  /**
   * Registers a system to be updated by the world.
   *
   * @param system - The {@link System} instance to add.
   */
  addSystem(system: System): void {
    this.systems.push(system)
  }

  /**
   * Updates all registered systems in the order they were added.
   *
   * @param deltaTime - Time elapsed since the last update in milliseconds.
   */
  update(deltaTime: number): void {
    this.systems.forEach((system) => system.update(this, deltaTime))
  }

  /**
   * Returns a list of all active entities currently in the world.
   *
   * @returns An array of all {@link Entity} IDs.
   */
  getAllEntities(): Entity[] {
    return Array.from(this.entities)
  }
}
