import { World, CoreComponentRegistry } from "../src";

describe("ECS Core", () => {
  it("should create and manage entities and components", () => {
    const world = new World<CoreComponentRegistry>();
    const entity = world.createEntity();

    world.addComponent(entity, {
      type: "Transform",
      x: 10,
      y: 20,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 10,
      worldY: 20,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });

    const transform = world.getComponent(entity, "Transform");
    expect(transform).toBeDefined();
    expect(transform?.x).toBe(10);

    world.mutateComponent(entity, "Transform", (t) => {
      t.x = 30;
    });

    expect(world.getComponent(entity, "Transform")?.x).toBe(30);
  });

  it("should execute queries correctly", () => {
    const world = new World<CoreComponentRegistry>();
    const entity1 = world.createEntity();
    const entity2 = world.createEntity();

    world.addComponent(entity1, { type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, worldX: 0, worldY: 0, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false });
    world.addComponent(entity2, { type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, worldX: 0, worldY: 0, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false });
    world.addComponent(entity2, { type: "Velocity", vx: 1, vy: 1, angularVelocity: 0 });

    const query = world.query("Transform", "Velocity");
    expect(query.length).toBe(1);
    expect(query[0]).toBe(entity2);
  });
});
