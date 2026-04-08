import { World } from "../../core/World";
import { Camera2D } from "../Camera2D";
import { Camera2DComponent, TransformComponent } from "../../types/EngineTypes";

describe("Camera2D", () => {
  let world: World;
  let camera: Camera2D;

  beforeEach(() => {
    world = new World();
    camera = new Camera2D({ viewport: { width: 800, height: 600 } });
  });

  it("should calculate worldToScreen correctly", () => {
    const cam: Camera2DComponent = {
      type: "Camera2D",
      x: 100,
      y: 100,
      zoom: 1,
      shakeIntensity: 0,
      smoothing: 1,
      offset: { x: 0, y: 0 },
      bounds: null
    };

    const screenPos = Camera2D.worldToScreen({ x: 150, y: 150 }, cam);
    expect(screenPos.x).toBe(50);
    expect(screenPos.y).toBe(50);
  });

  it("should calculate screenToWorld correctly", () => {
    const cam: Camera2DComponent = {
      type: "Camera2D",
      x: 100,
      y: 100,
      zoom: 2,
      shakeIntensity: 0,
      smoothing: 1,
      offset: { x: 0, y: 0 },
      bounds: null
    };

    const worldPos = Camera2D.screenToWorld({ x: 50, y: 50 }, cam);
    expect(worldPos.x).toBe(125);
    expect(worldPos.y).toBe(125);
  });

  it("should follow a target with smoothing", () => {
    const target = world.createEntity();
    world.addComponent(target, { type: "Transform", x: 500, y: 500, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);

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
      bounds: null
    };
    world.addComponent(camEntity, cam);

    // After one update with 0.1 smoothing, it should move towards target
    camera.update(world, 16);

    expect(cam.x).toBeGreaterThan(0);
    expect(cam.y).toBeGreaterThan(0);
  });
});
