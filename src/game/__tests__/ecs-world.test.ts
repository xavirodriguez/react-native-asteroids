import { World, System } from "../ecs-world";
import type { Component } from "../../types/GameTypes";

describe("ECS World", () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  test("should create entities with unique IDs", () => {
    const e1 = world.createEntity();
    const e2 = world.createEntity();
    expect(e1).toBeDefined();
    expect(e2).toBeDefined();
    expect(e1).not.toBe(e2);
  });

  test("should add and get components", () => {
    const entity = world.createEntity();
    const pos = { type: "Position", x: 10, y: 20 } as Component;
    world.addComponent(entity, pos);

    const retrieved = world.getComponent(entity, "Position");
    expect(retrieved).toEqual(pos);
  });

  test("should remove components", () => {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "Position", x: 10, y: 20 } as Component);
    world.removeComponent(entity, "Position");

    expect(world.getComponent(entity, "Position")).toBeUndefined();
  });

  test("should query entities by component types", () => {
    const e1 = world.createEntity();
    const e2 = world.createEntity();
    const e3 = world.createEntity();

    world.addComponent(e1, { type: "Position", x: 0, y: 0 } as Component);
    world.addComponent(e1, { type: "Velocity", dx: 0, dy: 0 } as Component);

    world.addComponent(e2, { type: "Position", x: 0, y: 0 } as Component);

    world.addComponent(e3, { type: "Velocity", dx: 0, dy: 0 } as Component);

    const posEntities = world.query("Position");
    expect(posEntities).toContain(e1);
    expect(posEntities).toContain(e2);
    expect(posEntities).not.toContain(e3);

    const movingEntities = world.query("Position", "Velocity");
    expect(movingEntities).toContain(e1);
    expect(movingEntities).not.toContain(e2);
    expect(movingEntities).not.toContain(e3);
  });

  test("should remove entities and their components", () => {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "Position", x: 10, y: 20 } as Component);

    world.removeEntity(entity);

    expect(world.getAllEntities()).not.toContain(entity);
    expect(world.getComponent(entity, "Position")).toBeUndefined();
  });

  test("should update systems", () => {
    class MockSystem extends System {
      updated = false;
      update(w: World, dt: number) {
        this.updated = true;
      }
    }
    const system = new MockSystem();
    world.addSystem(system);
    world.update(16);
    expect(system.updated).toBe(true);
  });
});
