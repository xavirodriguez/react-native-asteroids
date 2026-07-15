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

    it("should serialize and deserialize SoA snapshots via BinaryCompression without data loss", () => {
      const { BinaryCompression } = require("../src");
      const world = new World<CoreComponentRegistry>();
      world.setResource("UseSoASnapshots", true);
      const entity = world.createEntity();

      const transform: TransformComponent = {
        type: "Transform",
        x: 42.5, y: -99.9, rotation: Math.PI / 4, scaleX: 1, scaleY: 1,
        worldX: 42.5, worldY: -99.9, worldRotation: Math.PI / 4, worldScaleX: 1, worldScaleY: 1,
        dirty: true
      };
      world.addComponent(entity, transform);

      const snapshot = world.snapshot();
      expect(snapshot.isSoA).toBe(true);

      // Serialize and deserialize to binary
      const binary = BinaryCompression.pack(snapshot);
      expect(binary).toBeInstanceOf(Uint8Array);

      const unpacked = BinaryCompression.unpack(binary);
      expect(unpacked.isSoA).toBe(true);
      expect(unpacked.soaComponentData).toBeDefined();

      const transformData = unpacked.soaComponentData["Transform"];
      expect(transformData.entities[0]).toBe(entity);
      expect(transformData.values).toBeDefined();

      // Restore the world state from the unpacked binary snapshot
      const restoreWorld = new World<CoreComponentRegistry>();
      restoreWorld.restore(unpacked);

      const restoredComp = restoreWorld.getComponent(entity, "Transform");
      expect(restoredComp).toBeDefined();
      expect(restoredComp?.x).toBe(42.5);
      expect(restoredComp?.y).toBe(-99.9);
      expect(restoredComp?.dirty).toBe(true);
    });
  });
});
