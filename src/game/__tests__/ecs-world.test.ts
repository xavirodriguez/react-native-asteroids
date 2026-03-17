import { World, System } from "../ecs-world"
import type { Component, ComponentType } from "../../types/GameTypes"

interface MockComponent extends Component {
  type: ComponentType
  value: number
}

interface OtherComponent extends Component {
  type: ComponentType
  type_other: boolean
}

class MockSystem extends System {
  updated = false
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(world: World, deltaTime: number): void {
    this.updated = true
  }
}

describe("ECS World", () => {
  let world: World

  beforeEach(() => {
    world = new World()
  })

  test("should create unique entities", () => {
    const e1 = world.createEntity()
    const e2 = world.createEntity()
    expect(e1).not.toBe(e2)
    expect(world.getAllEntities()).toContain(e1)
    expect(world.getAllEntities()).toContain(e2)
  })

  test("should retrieve components", () => {
    const entity = world.createEntity()
    const component = createMockComponent(42)
    world.addComponent(entity, component)
    expect(world.getComponent<MockComponent>(entity, "Mock" as ComponentType)).toBe(component)
  })

  test("should remove components", () => {
    const entity = world.createEntity()
    world.addComponent(entity, createMockComponent(42))
    world.removeComponent(entity, "Mock" as ComponentType)
    expect(world.getComponent(entity, "Mock" as ComponentType)).toBeUndefined()
  })

  test("should query entities by components", () => {
    const e1 = world.createEntity()
    const e2 = world.createEntity()
    world.addComponent(e1, createMockComponent(1))
    world.addComponent(e2, createOtherComponent(true))

    const results = world.query("Mock" as ComponentType)
    expect(results).toContain(e1)
    expect(results).not.toContain(e2)
  })

  test("should remove entities and their components", () => {
    const entity = world.createEntity()
    world.addComponent(entity, createMockComponent(1))
    world.removeEntity(entity)
    expect(world.getAllEntities()).not.toContain(entity)
    expect(world.getComponent(entity, "Mock" as ComponentType)).toBeUndefined()
    expect(world.query("Mock" as ComponentType)).not.toContain(entity)
  })

  test("should update systems", () => {
    const system = new MockSystem()
    world.addSystem(system)
    world.update(16)
    expect(system.updated).toBe(true)
  })

  test("should clear the world", () => {
    const e1 = world.createEntity()
    world.addComponent(e1, createMockComponent(1))

    world.clear()

    expect(world.getAllEntities().length).toBe(0)
    expect(world.query("Mock" as ComponentType).length).toBe(0)
    expect(world.getComponent(e1, "Mock" as ComponentType)).toBeUndefined()
  })
})

function createMockComponent(value: number): MockComponent {
  return { type: "Mock" as ComponentType, value }
}

function createOtherComponent(type_other: boolean): OtherComponent {
  return { type: "Other" as ComponentType, type_other }
}
