import { World, System } from "../ecs-world"
import type { Component } from "../../types/GameTypes"

interface MockComponent extends Component {
  type: "Mock"
  value: number
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

  test("should add and retrieve components", () => {
    const entity = world.createEntity()
    const component: MockComponent = { type: "Mock", value: 42 }
    world.addComponent(entity, component)
    expect(world.getComponent<MockComponent>(entity, "Mock")).toBe(component)
  })

  test("should remove components", () => {
    const entity = world.createEntity()
    world.addComponent(entity, { type: "Mock", value: 42 } as MockComponent)
    world.removeComponent(entity, "Mock")
    expect(world.getComponent(entity, "Mock")).toBeUndefined()
  })

  test("should query entities by components", () => {
    const e1 = world.createEntity()
    const e2 = world.createEntity()
    world.addComponent(e1, { type: "Mock", value: 1 } as MockComponent)
    world.addComponent(e2, { type: "Other", type_other: true } as any)

    const results = world.query("Mock")
    expect(results).toContain(e1)
    expect(results).not.toContain(e2)
  })

  test("should remove entities and their components", () => {
    const entity = world.createEntity()
    world.addComponent(entity, { type: "Mock", value: 1 } as MockComponent)
    world.removeEntity(entity)
    expect(world.getAllEntities()).not.toContain(entity)
    expect(world.getComponent(entity, "Mock")).toBeUndefined()
    expect(world.query("Mock")).not.toContain(entity)
  })

  test("should update systems", () => {
    const system = new MockSystem()
    world.addSystem(system)
    world.update(16)
    expect(system.updated).toBe(true)
  })

  test("should clear the world", () => {
    const e1 = world.createEntity()
    world.addComponent(e1, { type: "Mock", value: 1 } as MockComponent)

    world.clear()

    expect(world.getAllEntities().length).toBe(0)
    expect(world.query("Mock").length).toBe(0)
    expect(world.getComponent(e1, "Mock")).toBeUndefined()
  })
})
