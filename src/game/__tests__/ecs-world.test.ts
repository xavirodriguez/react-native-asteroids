import { World, System } from "../ecs-world";
import { Component, ComponentType, Entity } from "../../types/GameTypes";

describe("ECS World", () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  it("should create unique entities", () => {
    const e1 = world.createEntity();
    const e2 = world.createEntity();
    expect(e1).not.toBe(e2);
    expect(world.getAllEntities()).toContain(e1);
    expect(world.getAllEntities()).toContain(e2);
  });

  it("should add and retrieve components", () => {
    const entity = world.createEntity();
    const component = { type: "Position", x: 10, y: 20 } as any;
    world.addComponent(entity, component);

    const retrieved = world.getComponent(entity, "Position");
    expect(retrieved).toBe(component);
  });

  it("should remove components", () => {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "Position", x: 10, y: 20 } as any);
    world.removeComponent(entity, "Position");

    expect(world.getComponent(entity, "Position")).toBeUndefined();
  });

  it("should query entities by components", () => {
    const e1 = world.createEntity();
    const e2 = world.createEntity();
    const e3 = world.createEntity();

    world.addComponent(e1, { type: "Position", x: 0, y: 0 } as any);
    world.addComponent(e1, { type: "Velocity", dx: 0, dy: 0 } as any);

    world.addComponent(e2, { type: "Position", x: 0, y: 0 } as any);

    world.addComponent(e3, { type: "Velocity", dx: 0, dy: 0 } as any);

    const posEntities = world.query("Position");
    expect(posEntities).toContain(e1);
    expect(posEntities).toContain(e2);
    expect(posEntities).not.toContain(e3);

    const bothEntities = world.query("Position", "Velocity");
    expect(bothEntities).toContain(e1);
    expect(bothEntities).not.toContain(e2);
    expect(bothEntities).not.toContain(e3);
  });

  it("should remove entities and their components", () => {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "Position", x: 10, y: 20 } as any);
    world.removeEntity(entity);

    expect(world.getAllEntities()).not.toContain(entity);
    expect(world.getComponent(entity, "Position")).toBeUndefined();
  });

  it("should update systems", () => {
    const mockUpdate = jest.fn();
    class MockSystem extends System {
      update(world: World, deltaTime: number): void {
        mockUpdate(world, deltaTime);
      }
    }

    world.addSystem(new MockSystem());
    world.update(16);

    expect(mockUpdate).toHaveBeenCalledWith(world, 16);
  });
});
