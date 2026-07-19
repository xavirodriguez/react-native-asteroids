import { World, CoreComponentRegistry, TransformComponent, VelocityComponent } from "../src";

describe("ECS Core", () => {
  it("should create and manage entities and components", () => {
    const world = new World<CoreComponentRegistry>();
    const entity = world.createEntity();

    const transform: TransformComponent = {
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
    };

    world.addComponent(entity, transform);

    const retrievedTransform = world.getComponent(entity, "Transform");
    expect(retrievedTransform).toBeDefined();
    expect(retrievedTransform?.x).toBe(10);

    world.mutateComponent(entity, "Transform", (t) => {
      t.x = 30;
    });

    expect(world.getComponent(entity, "Transform")?.x).toBe(30);
  });

  it("should throw a TypeError when attempting to directly mutate a component returned by getComponent in DEV mode", () => {
    const world = new World<CoreComponentRegistry>();
    const entity = world.createEntity();

    const transform: TransformComponent = {
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
    };

    world.addComponent(entity, transform);

    const retrievedTransform = world.getComponent(entity, "Transform") as any;
    expect(retrievedTransform).toBeDefined();

    // In Node / Jest, process.env.NODE_ENV is test, so isDev will be true. It should throw TypeError.
    expect(() => {
      retrievedTransform.x = 999;
    }).toThrow(TypeError);
  });

  it("should deep clone a nested object/array when mutating a frozen component", () => {
    interface NestedComponent {
      type: "Nested";
      data: { value: number; list: number[] };
    }
    const world = new World<CoreComponentRegistry & { Nested: NestedComponent }>();
    const entity = world.createEntity();

    const nested: NestedComponent = {
      type: "Nested",
      data: { value: 10, list: [1, 2, 3] }
    };

    world.addComponent(entity, nested as any);

    // Call getComponent to freeze it shallowly (since DEV mode is active under Jest/Node)
    const retrieved = world.getComponent(entity, "Nested" as any) as any;
    expect(retrieved).toBeDefined();

    // Now mutate nested properties using mutateComponent
    world.mutateComponent(entity, "Nested" as any, (n: any) => {
      n.data.value = 42;
      n.data.list.push(4);
    });

    const mutated = world.getComponent(entity, "Nested" as any) as any;
    expect(mutated.data.value).toBe(42);
    expect(mutated.data.list).toEqual([1, 2, 3, 4]);

    // Check that the original frozen object reference's data was NOT mutated if we held it
    // because mutateComponent replaced the whole component reference in componentMaps
    // and deep cloned it, so the retrieved component's data is totally decoupled!
    expect(retrieved.data.value).toBe(10);
    expect(retrieved.data.list).toEqual([1, 2, 3]);
  });

  it("should execute queries correctly", () => {
    const world = new World<CoreComponentRegistry>();
    const entity1 = world.createEntity();
    const entity2 = world.createEntity();

    const t1: TransformComponent = { type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, worldX: 0, worldY: 0, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false };
    const t2: TransformComponent = { type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, worldX: 0, worldY: 0, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false };
    const v2: VelocityComponent = { type: "Velocity", vx: 1, vy: 1, angularVelocity: 0 };

    world.addComponent(entity1, t1);
    world.addComponent(entity2, t2);
    world.addComponent(entity2, v2);

    const query = world.query("Transform", "Velocity");
    expect(query.length).toBe(1);
    expect(query[0]).toBe(entity2);
  });

  it("should support readComponent with frozen results and checkUpdatingMutation safeguards", () => {
    const world = new World<CoreComponentRegistry>();
    const entity = world.createEntity();

    const t: TransformComponent = { type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, worldX: 0, worldY: 0, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false };
    world.addComponent(entity, t);

    // Test readComponent freezes component in DEV
    const readResult = world.readComponent(entity, "Transform") as any;
    expect(readResult).toBeDefined();
    expect(() => {
      readResult.x = 123;
    }).toThrow(TypeError);

    // Test checkUpdatingMutation throw on direct mutations during update
    world.isUpdating = true;
    expect(() => {
      world.createEntity();
    }).toThrow(/Direct structural mutation/);

    expect(() => {
      world.removeEntity(entity);
    }).toThrow(/Direct structural mutation/);

    expect(() => {
      const anotherTransform: TransformComponent = { type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, worldX: 0, worldY: 0, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false };
      world.addComponent(entity, anotherTransform);
    }).toThrow(/Direct structural mutation/);

    expect(() => {
      world.removeComponent(entity, "Transform");
    }).toThrow(/Direct structural mutation/);

    world.isUpdating = false;
  });
});
