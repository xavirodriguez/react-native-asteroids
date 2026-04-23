import { World } from "../World";
import { Component } from "../Component";
import { System } from "../System";

interface TransformComponent extends Component {
  type: "Transform";
  x: number;
  y: number;
}

interface VelocityComponent extends Component {
  type: "Velocity";
  dx: number;
  dy: number;
}

class TestSystem extends System {
  public updateCalled = false;
  public lastDeltaTime = 0;

  update(world: World, deltaTime: number): void {
    this.updateCalled = true;
    this.lastDeltaTime = deltaTime;
  }
}

describe("World", () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  describe("Entity Management", () => {
    it("should create unique entity IDs", () => {
      const e1 = world.createEntity();
      const e2 = world.createEntity();
      expect(e1).not.toBe(e2);
    });

    it("should increment structureVersion when creating an entity", () => {
      const initialVersion = world.structureVersion;
      world.createEntity();
      expect(world.structureVersion).toBeGreaterThan(initialVersion);
    });

    it("should return all active entities", () => {
      const e1 = world.createEntity();
      const e2 = world.createEntity();
      const entities = world.getAllEntities();
      expect(entities).toContain(e1);
      expect(entities).toContain(e2);
      expect(entities.length).toBe(2);
    });

    it("should remove an entity and increment structureVersion", () => {
      const e1 = world.createEntity();
      const initialVersion = world.structureVersion;
      world.removeEntity(e1);
      expect(world.getAllEntities()).not.toContain(e1);
      expect(world.structureVersion).toBeGreaterThan(initialVersion);
    });

    it("should clean up components when an entity is removed", () => {
      const entity = world.createEntity();
      world.addComponent(entity, { type: "Transform", x: 10, y: 20 } as TransformComponent);
      world.removeEntity(entity);
      expect(world.hasComponent(entity, "Transform")).toBe(false);
      expect(world.query("Transform")).not.toContain(entity);
    });
  });

  describe("Component Management", () => {
    it("should add and retrieve a component", () => {
      const entity = world.createEntity();
      const pos: TransformComponent = { type: "Transform", x: 10, y: 20 };
      world.addComponent(entity, pos);

      expect(world.hasComponent(entity, "Transform")).toBe(true);
      const retrieved = world.getComponent<TransformComponent>(entity, "Transform");
      expect(retrieved).toBe(pos);
    });

    it("should overwrite a component of the same type", () => {
      const entity = world.createEntity();
      const pos1: TransformComponent = { type: "Transform", x: 10, y: 20 };
      const pos2: TransformComponent = { type: "Transform", x: 30, y: 40 };

      world.addComponent(entity, pos1);
      world.addComponent(entity, pos2);

      expect(world.getComponent<TransformComponent>(entity, "Transform")).toBe(pos2);
    });

    it("should increment structureVersion when adding a NEW component type", () => {
      const entity = world.createEntity();
      const initialVersion = world.structureVersion;
      world.addComponent(entity, { type: "Transform", x: 10, y: 20 } as TransformComponent);
      expect(world.structureVersion).toBeGreaterThan(initialVersion);
    });

    it("should increment stateVersion when updating an EXISTING component", () => {
      const entity = world.createEntity();
      world.addComponent(entity, { type: "Transform", x: 10, y: 20 } as TransformComponent);
      const initialStructureVersion = world.structureVersion;
      const initialStateVersion = world.stateVersion;

      world.addComponent(entity, { type: "Transform", x: 20, y: 30 } as TransformComponent);

      expect(world.structureVersion).toBe(initialStructureVersion);
      expect(world.stateVersion).toBeGreaterThan(initialStateVersion);
    });

    it("should remove a component and increment structureVersion", () => {
      const entity = world.createEntity();
      world.addComponent(entity, { type: "Transform", x: 10, y: 20 } as TransformComponent);
      const versionAfterAdd = world.structureVersion;

      world.removeComponent(entity, "Transform");
      expect(world.hasComponent(entity, "Transform")).toBe(false);
      expect(world.structureVersion).toBeGreaterThan(versionAfterAdd);
    });
  });

  describe("Querying", () => {
    it("should return entities with a single component", () => {
      const e1 = world.createEntity();
      const e2 = world.createEntity();
      world.addComponent(e1, { type: "Transform", x: 0, y: 0 } as TransformComponent);

      const results = world.query("Transform");
      expect(results).toContain(e1);
      expect(results).not.toContain(e2);
    });

    it("should return entities with multiple components", () => {
      const e1 = world.createEntity();
      const e2 = world.createEntity();
      world.addComponent(e1, { type: "Transform", x: 0, y: 0 } as TransformComponent);
      world.addComponent(e1, { type: "Velocity", dx: 1, dy: 1 } as VelocityComponent);
      world.addComponent(e2, { type: "Transform", x: 10, y: 10 } as TransformComponent);

      const results = world.query("Transform", "Velocity");
      expect(results).toContain(e1);
      expect(results).not.toContain(e2);
    });

    it("should return an empty array if no entities match", () => {
      world.createEntity();
      expect(world.query("NonExistent")).toEqual([]);
    });

    it("should return an empty array if query is empty", () => {
      world.createEntity();
      expect(world.query()).toEqual([]);
    });
  });

  describe("Systems", () => {
    it("should call update on registered systems", () => {
      const system = new TestSystem();
      world.addSystem(system);

      world.update(16.67);
      expect(system.updateCalled).toBe(true);
      expect(system.lastDeltaTime).toBe(16.67);
    });
  });

  describe("World Operations", () => {
    it("should clear all entities and components but keep systems", () => {
      const entity = world.createEntity();
      world.addComponent(entity, { type: "Transform", x: 0, y: 0 } as TransformComponent);
      const system = new TestSystem();
      world.addSystem(system);

      world.clear();

      expect(world.getAllEntities().length).toBe(0);
      expect(world.query("Transform").length).toBe(0);

      world.update(10);
      expect(system.updateCalled).toBe(true);
    });

    it("should snapshot and restore correctly", () => {
      const e1 = world.createEntity();
      const e2 = world.createEntity();
      world.addComponent(e1, { type: "Transform", x: 10, y: 20 } as TransformComponent);
      world.addComponent(e2, { type: "Velocity", dx: 5, dy: 5 } as VelocityComponent);

      const snapshot = world.snapshot();

      const newWorld = new World();
      newWorld.restore(snapshot);

      expect(newWorld.getAllEntities()).toEqual([e1, e2].sort((a, b) => a - b));
      expect(newWorld.getComponent(e1, "Transform")).toEqual({ type: "Transform", x: 10, y: 20 });
      expect(newWorld.getComponent(e2, "Velocity")).toEqual({ type: "Velocity", dx: 5, dy: 5 });
      expect(newWorld.query("Transform")).toContain(e1);
      expect(newWorld.query("Velocity")).toContain(e2);
    });

    it("should return entities in deterministic order from query", () => {
      const e3 = world.createEntity();
      const e1 = world.createEntity();
      const e2 = world.createEntity();

      world.addComponent(e1, { type: "Transform", x: 1, y: 1 } as TransformComponent);
      world.addComponent(e2, { type: "Transform", x: 2, y: 2 } as TransformComponent);
      world.addComponent(e3, { type: "Transform", x: 3, y: 3 } as TransformComponent);

      const entities = world.query("Transform");
      expect(entities).toEqual([e1, e2, e3].sort((a, b) => a - b));
    });

    it("should increment structureVersion on clear", () => {
      const initialVersion = world.structureVersion;
      world.clear();
      expect(world.structureVersion).toBeGreaterThan(initialVersion);
    });
  });
});
