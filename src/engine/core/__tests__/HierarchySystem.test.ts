import { World } from "../../core/World";
import { HierarchySystem } from "../HierarchySystem";
import { TransformComponent } from "../../types/EngineTypes";

describe("HierarchySystem Iterative", () => {
  let world: World;
  let system: HierarchySystem;

  beforeEach(() => {
    world = new World();
    system = new HierarchySystem();
  });

  it("should update child transform based on parent", () => {
    const parent = world.createEntity();
    const parentTrans = world.addComponent(parent, {
      type: "Transform", x: 10, y: 20, rotation: 0, scaleX: 1, scaleY: 1, dirty: true
    } as TransformComponent);

    const child = world.createEntity();
    const childTrans = world.addComponent(child, {
      type: "Transform", x: 5, y: 5, rotation: 0, scaleX: 1, scaleY: 1, parent: parent, dirty: true
    } as TransformComponent);

    system.update(world, 16.67);

    expect(parentTrans.worldX).toBe(10);
    expect(parentTrans.worldY).toBe(20);
    expect(childTrans.worldX).toBe(15);
    expect(childTrans.worldY).toBe(25);
  });

  it("should handle deep hierarchies", () => {
    let lastEntity = world.createEntity();
    world.addComponent(lastEntity, {
      type: "Transform", x: 1, y: 1, rotation: 0, scaleX: 1, scaleY: 1, dirty: true
    } as TransformComponent);

    for (let i = 0; i < 10; i++) {
      const next = world.createEntity();
      world.addComponent(next, {
        type: "Transform", x: 1, y: 1, rotation: 0, scaleX: 1, scaleY: 1, parent: lastEntity, dirty: true
      } as TransformComponent);
      lastEntity = next;
    }

    system.update(world, 16.67);

    const leafTrans = world.getComponent<TransformComponent>(lastEntity, "Transform");
    expect(leafTrans?.worldX).toBe(11);
    expect(leafTrans?.worldY).toBe(11);
  });

  it("should detect circular dependencies and not crash", () => {
    const e1 = world.createEntity();
    const e2 = world.createEntity();

    world.addComponent(e1, { type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, parent: e2, dirty: true } as TransformComponent);
    world.addComponent(e2, { type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, parent: e1, dirty: true } as TransformComponent);

    const spy = jest.spyOn(console, 'warn').mockImplementation();

    // Should not throw stack overflow
    expect(() => system.update(world, 16.67)).not.toThrow();
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("Circular dependency"));

    spy.mockRestore();
  });
});
