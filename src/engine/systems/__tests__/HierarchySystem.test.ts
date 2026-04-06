import { World } from "../../core/World";
import { HierarchySystem } from "../HierarchySystem";
import { TransformComponent } from "../../types/EngineTypes";

describe("HierarchySystem", () => {
  let world: World;
  let system: HierarchySystem;

  beforeEach(() => {
    world = new World();
    system = new HierarchySystem();
  });

  it("should calculate correct world transform for a root entity", () => {
    const entity = world.createEntity();
    const transform: TransformComponent = {
      type: "Transform",
      x: 10,
      y: 20,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    };
    world.addComponent(entity, transform);

    system.update(world, 16);

    expect(transform.worldX).toBe(10);
    expect(transform.worldY).toBe(20);
  });

  it("should calculate correct world transform for a child node", () => {
    const parent = world.createEntity();
    const child = world.createEntity();

    const parentTransform: TransformComponent = {
      type: "Transform",
      x: 100,
      y: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    };
    const childTransform: TransformComponent = {
      type: "Transform",
      x: 50,
      y: 50,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      parent: parent,
    };

    world.addComponent(parent, parentTransform);
    world.addComponent(child, childTransform);

    system.update(world, 16);

    expect(childTransform.worldX).toBe(150);
    expect(childTransform.worldY).toBe(150);
  });

  it("should propagate transforms through rotation", () => {
    const parent = world.createEntity();
    const child = world.createEntity();

    const parentTransform: TransformComponent = {
      type: "Transform",
      x: 0,
      y: 0,
      rotation: Math.PI / 2, // 90 degrees
      scaleX: 1,
      scaleY: 1,
    };
    const childTransform: TransformComponent = {
      type: "Transform",
      x: 10,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      parent: parent,
    };

    world.addComponent(parent, parentTransform);
    world.addComponent(child, childTransform);

    system.update(world, 16);

    // At 90 degrees, child (10, 0) should be at (0, 10) in world space
    expect(childTransform.worldX).toBeCloseTo(0);
    expect(childTransform.worldY).toBeCloseTo(10);
  });

  it("should support reparenting", () => {
    const root1 = world.createEntity();
    const root2 = world.createEntity();
    const child = world.createEntity();

    const t1: TransformComponent = { type: "Transform", x: 100, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
    const t2: TransformComponent = { type: "Transform", x: 500, y: 0, rotation: 0, scaleX: 1, scaleY: 1 };
    const tc: TransformComponent = { type: "Transform", x: 10, y: 0, rotation: 0, scaleX: 1, scaleY: 1, parent: root1 };

    world.addComponent(root1, t1);
    world.addComponent(root2, t2);
    world.addComponent(child, tc);

    system.update(world, 16);
    expect(tc.worldX).toBe(110);

    tc.parent = root2;
    system.update(world, 16);
    expect(tc.worldX).toBe(510);
  });
});
