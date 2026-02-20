import { World, System } from "../ecs-world";
import type { Component } from "../../types/GameTypes";

describe("ECS World", () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  test("should create unique entities", () => {
    const e1 = world.createEntity();
    const e2 = world.createEntity();
    expect(e1).not.toBe(e2);
    expect(typeof e1).toBe("number");
  });

  test("should add and get components", () => {
    const entity = world.createEntity();
    const component: Component = { type: "Position" };
    (component as any).x = 10;
    (component as any).y = 20;

    world.addComponent(entity, component);
    const retrieved = world.getComponent(entity, "Position");
    expect(retrieved).toBe(component);
    expect((retrieved as any).x).toBe(10);
  });

  test("should remove components", () => {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "Position" });
    world.removeComponent(entity, "Position");
    expect(world.getComponent(entity, "Position")).toBeUndefined();
  });

  test("should query entities by components", () => {
    const e1 = world.createEntity();
    const e2 = world.createEntity();
    const e3 = world.createEntity();

    world.addComponent(e1, { type: "Position" });
    world.addComponent(e1, { type: "Velocity" });
    world.addComponent(e2, { type: "Position" });
    world.addComponent(e3, { type: "Velocity" });

    const both = world.query("Position", "Velocity");
    expect(both).toContain(e1);
    expect(both).not.toContain(e2);
    expect(both).not.toContain(e3);
    expect(both.length).toBe(1);

    const pos = world.query("Position");
    expect(pos).toContain(e1);
    expect(pos).toContain(e2);
    expect(pos.length).toBe(2);
  });

  test("should remove entities and their components", () => {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "Position" });
    world.removeEntity(entity);

    expect(world.getAllEntities()).not.toContain(entity);
    expect(world.getComponent(entity, "Position")).toBeUndefined();
  });

  test("should update systems", () => {
    const mockUpdate = jest.fn();
    class MockSystem extends System {
      update(w: World, dt: number) {
        mockUpdate(w, dt);
      }
    }

    const system = new MockSystem();
    world.addSystem(system);
    world.update(16.67);

    expect(mockUpdate).toHaveBeenCalledWith(world, 16.67);
  });
});
