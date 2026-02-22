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
 * Performance note: Component queries are currently performed by filtering all entities,
 * which is $O(N)$ where $N$ is the number of entities.
 *
 * @example
 * ```typescript
 * const world = new World();
 * const entity = world.createEntity();
 * world.addComponent(entity, { type: "Position", x: 0, y: 0 });
 * world.addSystem(new MovementSystem());
 *
 * // In the game loop
 * world.update(16.67);
 * ```
 */
export class World {
  private entities = new Set<Entity>()
  private components = new Map<ComponentType, Map<Entity, Component>>()
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
   *
   * @example
   * ```typescript
   * const entityId = world.createEntity();
   * ```
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
   * @typeParam T - The specific component type, must extend {@link Component}.
   *
   * @example
   * ```typescript
   * world.addComponent(player, { type: "Position", x: 10, y: 20 });
   * ```
   */
  addComponent<T extends Component>(entity: Entity, component: T): void {
    const type = component.type
    if (!this.components.has(type)) {
      this.components.set(type, new Map())
    }
    this.components.get(type)!.set(entity, component)
    this.version++
  }

  /**
   * Retrieves a component of a specific type from an entity.
   *
   * @param entity - The entity to get the component from.
   * @param type - The type of the component to retrieve.
   * @returns The component instance if found, otherwise `undefined`.
   * @typeParam T - The expected component type.
   *
   * @example
   * ```typescript
   * const pos = world.getComponent<PositionComponent>(entity, "Position");
   * if (pos) {
   *   console.log(pos.x, pos.y);
   * }
   * ```
   */
  getComponent<T extends Component>(entity: Entity, type: ComponentType): T | undefined {
    return this.components.get(type)?.get(entity) as T
  }

  /**
   * Removes a component of a specific type from an entity.
   *
   * @param entity - The entity to remove the component from.
   * @param type - The type of the component to remove.
   *
   * @example
   * ```typescript
   * world.removeComponent(entity, "Position");
   * ```
   */
  removeComponent(entity: Entity, type: ComponentType): void {
    if (this.components.get(type)?.delete(entity)) {
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
   * This method is the primary way for systems to find entities they need to process.
   *
   * @example
   * ```typescript
   * const movingEntities = world.query("Position", "Velocity");
   * ```
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
   *
   * @example
   * ```typescript
   * world.removeEntity(bullet);
   * ```
   */
  removeEntity(entity: Entity): void {
    this.components.forEach((componentMap) => {
      componentMap.delete(entity)
    })
    if (this.entities.delete(entity)) {
      this.version++
    }
  }

  /**
   * Registers a system to be updated by the world.
   *
   * @param system - The {@link System} instance to add.
   *
   * @example
   * ```typescript
   * world.addSystem(new MovementSystem());
   * ```
   */
  addSystem(system: System): void {
    this.systems.push(system)
  }

  /**
   * Updates all registered systems in the order they were added.
   *
   * @param deltaTime - Time elapsed since the last update in milliseconds.
   *
   * @example
   * ```typescript
   * world.update(16.67);
   * ```
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
