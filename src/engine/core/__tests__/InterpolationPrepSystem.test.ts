import { World } from "../../core/World";
import { InterpolationPrepSystem } from "../InterpolationPrepSystem";
import { TransformComponent, PreviousTransformComponent } from "../../core/CoreComponents";

describe("InterpolationPrepSystem", () => {
  let world: World;
  let system: InterpolationPrepSystem;

  beforeEach(() => {
    world = new World();
    system = new InterpolationPrepSystem();
  });

  it("should capture local coordinates when world coordinates are missing", () => {
    const entity = world.createEntity();
    const transform: TransformComponent = {
      type: "Transform",
      x: 10,
      y: 20,
      rotation: 1,
      scaleX: 1,
      scaleY: 1,
    };
    world.addComponent(entity, transform);

    system.update(world, 16.67);

    const prev = world.getComponent<PreviousTransformComponent>(entity, "PreviousTransform");
    expect(prev).toBeDefined();
    expect(prev?.x).toBe(10);
    expect(prev?.y).toBe(20);
    expect(prev?.rotation).toBe(1);
    expect(prev?.worldX).toBeUndefined();
  });

  it("should capture world coordinates when present", () => {
    const entity = world.createEntity();
    const transform: TransformComponent = {
      type: "Transform",
      x: 10,
      y: 20,
      rotation: 1,
      scaleX: 1,
      scaleY: 1,
      worldX: 100,
      worldY: 200,
      worldRotation: 2,
    };
    world.addComponent(entity, transform);

    system.update(world, 16.67);

    const prev = world.getComponent<PreviousTransformComponent>(entity, "PreviousTransform");
    expect(prev).toBeDefined();
    expect(prev?.x).toBe(10);
    expect(prev?.y).toBe(20);
    expect(prev?.rotation).toBe(1);
    expect(prev?.worldX).toBe(100);
    expect(prev?.worldY).toBe(200);
    expect(prev?.worldRotation).toBe(2);
  });

  it("should update existing PreviousTransformComponent", () => {
    const entity = world.createEntity();
    const transform: TransformComponent = {
      type: "Transform",
      x: 10,
      y: 20,
      rotation: 1,
      scaleX: 1,
      scaleY: 1,
    };
    world.addComponent(entity, transform);

    // First update
    system.update(world, 16.67);

    // Modify transform
    transform.x = 30;
    transform.y = 40;
    transform.worldX = 300;

    // Second update
    system.update(world, 16.67);

    const prev = world.getComponent<PreviousTransformComponent>(entity, "PreviousTransform");
    expect(prev?.x).toBe(30);
    expect(prev?.y).toBe(40);
    expect(prev?.worldX).toBe(300);
  });
});
