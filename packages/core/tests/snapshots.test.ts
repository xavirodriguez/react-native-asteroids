import { World, CoreComponentRegistry, TransformComponent } from "../src";

describe("World Snapshots", () => {
  it("should capture and restore world state", () => {
    const world = new World<CoreComponentRegistry>();
    const entity = world.createEntity();

    const transform: TransformComponent = {
      type: "Transform",
      x: 10, y: 20, rotation: 0, scaleX: 1, scaleY: 1,
      worldX: 10, worldY: 20, worldRotation: 0, worldScaleX: 1, worldScaleY: 1,
      dirty: false
    };
    world.addComponent(entity, transform);

    const snapshot = world.snapshot();
    expect(snapshot.entities).toContain(entity);
    expect(snapshot.componentData["Transform"][entity].x).toBe(10);

    // Modify world
    world.mutateComponent(entity, "Transform", (t) => {
      t.x = 50;
    });
    expect(world.getComponent(entity, "Transform")?.x).toBe(50);

    // Restore
    world.restore(snapshot);
    expect(world.getComponent(entity, "Transform")?.x).toBe(10);
  });

  it("should handle delta snapshots", () => {
    const world = new World<CoreComponentRegistry>();
    const entity = world.createEntity();

    const transform: TransformComponent = {
      type: "Transform",
      x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1,
      worldX: 0, worldY: 0, worldRotation: 0, worldScaleX: 1, worldScaleY: 1,
      dirty: false
    };
    world.addComponent(entity, transform);

    const version1 = world.stateVersion;

    // No changes
    const delta1 = world.deltaSnapshot(version1);
    expect(delta1.componentData).toEqual({});

    // Change something
    world.mutateComponent(entity, "Transform", (t) => {
      t.x = 100;
    });

    const delta2 = world.deltaSnapshot(version1);
    expect(delta2.componentData!["Transform"][entity].x).toBe(100);
  });

  describe("SoA Snapshots", () => {
    it("should capture and restore world state in SoA format", () => {
      const world = new World<CoreComponentRegistry>();
      world.setResource("UseSoASnapshots", true);
      const entity = world.createEntity();

      const transform: TransformComponent = {
        type: "Transform",
        x: 10, y: 20, rotation: 0, scaleX: 1, scaleY: 1,
        worldX: 10, worldY: 20, worldRotation: 0, worldScaleX: 1, worldScaleY: 1,
        dirty: false
      };
      world.addComponent(entity, transform);

      const snapshot = world.snapshot();
      expect(snapshot.isSoA).toBe(true);
      expect(snapshot.soaComponentData).toBeDefined();
      expect(snapshot.soaComponentData!["Transform"].entities[0]).toBe(entity);

      // Modify world
      world.mutateComponent(entity, "Transform", (t) => {
        t.x = 50;
      });
      expect(world.getComponent(entity, "Transform")?.x).toBe(50);

      // Restore
      world.restore(snapshot);
      expect(world.getComponent(entity, "Transform")?.x).toBe(10);
    });
  });
});
