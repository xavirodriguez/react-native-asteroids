import type { Component, ComponentType, Entity } from "../types/GameTypes"

export abstract class System {
  abstract update(world: World, deltaTime: number): void
}

export class World {
/**
 * ECS World class to manage entities, components, and systems.
 * - Entities are represented by unique IDs (numbers).
 * - Components are stored in a map, associating component types with entities.
 *   There are 9 component types: Position, Velocity, Render, Collider, Health, Input, TTL, Asteroid, GameState.
 * - Systems are stored in an array and can be updated each frame.
 */

  private entities = new Set<Entity>()
  private components = new Map<ComponentType, Map<Entity, Component>>()
  private systems: System[] = []
  private nextEntityId = 1

  createEntity(): Entity {
    const id = this.nextEntityId++
    this.entities.add(id)
    return id
  }

  addComponent<T extends Component>(entity: Entity, component: T): void {
    const type = component.type
    if (!this.components.has(type)) {
      this.components.set(type, new Map())
    }
    this.components.get(type)!.set(entity, component)
  }

  getComponent<T extends Component>(entity: Entity, type: ComponentType): T | undefined {
    return this.components.get(type)?.get(entity) as T
  }

  removeComponent(entity: Entity, type: ComponentType): void {
    this.components.get(type)?.delete(entity)
  }

  query(...componentTypes: ComponentType[]): Entity[] {
    return Array.from(this.entities).filter((entity) =>
      componentTypes.every((type) => this.components.get(type)?.has(entity)),
    )
  }

  removeEntity(entity: Entity): void {
    this.components.forEach((componentMap) => {
      componentMap.delete(entity)
    })
    this.entities.delete(entity)
  }

  addSystem(system: System): void {
    this.systems.push(system)
  }

  update(deltaTime: number): void {
    this.systems.forEach((system) => system.update(this, deltaTime))
  }

  getAllEntities(): Entity[] {
    return Array.from(this.entities)
  }
}
