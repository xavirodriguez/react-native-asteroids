import { World } from "../../core/World";
import { Camera2D } from "../Camera2D";
import { Camera2DComponent } from "../../types/EngineTypes";

describe("Camera2D", () => {
  let world: World;
  let system: Camera2D;

  beforeEach(() => {
    world = new World();
    system = new Camera2D();
  });

  it("should calculate worldToScreen correctly", () => {
    const cam: Camera2DComponent = {
      type: "Camera2D",
      x: 100,
      y: 50,
      zoom: 2,
      shakeIntensity: 0,
      smoothing: 1,
      offset: { x: 0, y: 0 },
    };

    const worldPos = { x: 150, y: 100 };
    const screenPos = Camera2D.worldToScreen(worldPos, cam);

    // (150 - 100) * 2 = 100
    // (100 - 50) * 2 = 100
    expect(screenPos).toEqual({ x: 100, y: 100 });
  });

  it("should calculate screenToWorld correctly", () => {
    const cam: Camera2DComponent = {
      type: "Camera2D",
      x: 100,
      y: 50,
      zoom: 2,
      shakeIntensity: 0,
      smoothing: 1,
      offset: { x: 0, y: 0 },
    };

    const screenPos = { x: 100, y: 100 };
    const worldPos = Camera2D.screenToWorld(screenPos, cam);

    // 100 / 2 + 100 = 150
    // 100 / 2 + 50 = 100
    expect(worldPos).toEqual({ x: 150, y: 100 });
  });

  it("should follow a target with smoothing", () => {
    const target = world.createEntity();
    world.addComponent(target, { type: "Transform", x: 200, y: 200, rotation: 0, scaleX: 1, scaleY: 1 });

    const camEntity = world.createEntity();
    const cam: Camera2DComponent = {
      type: "Camera2D",
      x: 0,
      y: 0,
      zoom: 1,
      shakeIntensity: 0,
      target: target,
      smoothing: 0.1,
      offset: { x: 0, y: 0 },
    };
    world.addComponent(camEntity, cam);

    system.update(world, 16);

    // target center for 800x600 viewport is (200 - 400, 200 - 300) = (-200, -100)
    // with 0.1 smoothing: 0 + (-200 - 0) * 0.1 = -20
    expect(cam.x).toBeCloseTo(-20);
    expect(cam.y).toBeCloseTo(-10);
  });
});
