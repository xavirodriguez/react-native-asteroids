import { World } from "../World";
import { Entity } from "../Entity";
import { Component } from "../Component";

interface TestComponent extends Component {
  type: "Test";
  value: number;
}

describe("StructuralCommandBuffer", () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  it("should defer entity creation until flush", () => {
    let createdEntity: Entity | undefined;
    world.commands.createEntity((entity) => {
      createdEntity = entity;
    });

    expect(world.getAllEntities().length).toBe(0);
    expect(createdEntity).toBeUndefined();

    world.flush();

    expect(world.getAllEntities().length).toBe(1);
    expect(createdEntity).toBeDefined();
  });

  it("should defer entity removal until flush", () => {
    const entity = world.createEntity();
    world.commands.removeEntity(entity);

    expect(world.getAllEntities().length).toBe(1);

    world.flush();

    expect(world.getAllEntities().length).toBe(0);
  });

  it("should defer adding components until flush", () => {
    const entity = world.createEntity();
    const component: TestComponent = { type: "Test", value: 42 };

    world.commands.addComponent(entity, component);

    expect(world.hasComponent(entity, "Test")).toBe(false);

    world.flush();

    expect(world.hasComponent(entity, "Test")).toBe(true);
    expect(world.getComponent<TestComponent>(entity, "Test")?.value).toBe(42);
  });

  it("should protect against iterator invalidation during query iteration", () => {
    // Create 10 entities with Test component
    for (let i = 0; i < 10; i++) {
      const e = world.createEntity();
      world.addComponent(e, { type: "Test", value: i } as TestComponent);
    }

    const entities = world.query("Test");
    expect(entities.length).toBe(10);

    let count = 0;
    for (const entity of entities) {
      world.commands.removeEntity(entity);
      count++;
    }

    expect(count).toBe(10);
    expect(world.getAllEntities().length).toBe(10); // Still there!

    world.flush();

    expect(world.getAllEntities().length).toBe(0); // Now gone.
  });

  it("should execute commands in order", () => {
    let entityId: Entity = 0;
    const buffer = world.commands;

    buffer.createEntity((id) => {
      entityId = id;
    });

    // Use callback to chain
    buffer.createEntity((id) => {
        world.commands.addComponent(id, { type: "Test", value: 200 } as TestComponent);
    });

    world.flush();

    expect(world.getAllEntities().length).toBe(2);
    expect(entityId).toBeDefined();

    const entitiesWithTest = world.query("Test");
    expect(entitiesWithTest.length).toBe(1);
    expect(world.getComponent<TestComponent>(entitiesWithTest[0], "Test")?.value).toBe(200);
  });

  it("should be cleared when world is cleared", () => {
    world.commands.createEntity();
    expect(world.commands.isEmpty).toBe(false);

    world.clear();
    expect(world.commands.isEmpty).toBe(true);
  });

  it("should be cleared when world is restored", () => {
    world.commands.createEntity();
    expect(world.commands.isEmpty).toBe(false);

    const snapshot = world.snapshot();
    world.restore(snapshot);
    expect(world.commands.isEmpty).toBe(true);
  });
});
