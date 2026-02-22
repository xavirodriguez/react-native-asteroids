import { World, System } from "../ecs-world";
import type { Component } from "../../types/GameTypes";

interface TestComponent extends Component {
  type: "Test";
  value: number;
}

class TestSystem extends System {
  updated = false;
  update(): void {
    this.updated = true;
  }
}

describe("ECS World", () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  test("should create unique entity IDs", () => {
    const e1 = world.createEntity();
    const e2 = world.createEntity();
    expect(e1).not.toBe(e2);
    expect(typeof e1).toBe("number");
  });

  test("should add and get components", () => {
    const entity = world.createEntity();
    const component: TestComponent = { type: "Test", value: 42 };

    world.addComponent(entity, component);
    const retrieved = world.getComponent<TestComponent>(entity, "Test");

    expect(retrieved).toBe(component);
    expect(retrieved?.value).toBe(42);
  });

  test("should return undefined for non-existent components", () => {
    const entity = world.createEntity();
    const retrieved = world.getComponent<TestComponent>(entity, "Test");
    expect(retrieved).toBeUndefined();
  });

  test("should remove components", () => {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "Test", value: 10 } as TestComponent);

    world.removeComponent(entity, "Test");
    expect(world.getComponent(entity, "Test")).toBeUndefined();
  });

  test("should query entities by component types", () => {
    const e1 = world.createEntity();
    const e2 = world.createEntity();
    const e3 = world.createEntity();

    world.addComponent(e1, { type: "Test", value: 1 } as TestComponent);
    world.addComponent(e1, { type: "Position", x: 0, y: 0 } as Component);

    world.addComponent(e2, { type: "Test", value: 2 } as TestComponent);

    // e3 has no components

    const testEntities = world.query("Test");
    expect(testEntities).toContain(e1);
    expect(testEntities).toContain(e2);
    expect(testEntities).not.toContain(e3);
    expect(testEntities.length).toBe(2);

    const complexQuery = world.query("Test", "Position");
    expect(complexQuery).toContain(e1);
    expect(complexQuery.length).toBe(1);
  });

  test("should remove entities and all their components", () => {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "Test", value: 100 } as TestComponent);

    world.removeEntity(entity);

    expect(world.getComponent(entity, "Test")).toBeUndefined();
    expect(world.getAllEntities()).not.toContain(entity);
  });

  test("should update systems", () => {
    const system = new TestSystem();
    world.addSystem(system);

    expect(system.updated).toBe(false);
    world.update(16);
    expect(system.updated).toBe(true);
  });
});
