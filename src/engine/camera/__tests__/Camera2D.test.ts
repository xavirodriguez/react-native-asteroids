import { World } from "../../core/World";
import { Camera2D } from "../Camera2D";
import { Camera2DComponent, TransformComponent } from "../../core/CoreComponents";

describe("Camera2D System", () => {
  let world: World;
  let cameraSystem: Camera2D;

  beforeEach(() => {
    world = new World();
    cameraSystem = new Camera2D({ viewport: { width: 800, height: 600 } });
  });

  it("should follow a single target", () => {
    const target = world.createEntity();
    world.addComponent(target, {
      type: "Transform",
      x: 1000,
      y: 1000,
      rotation: 0,
      scaleX: 1,
      scaleY: 1
    } as TransformComponent);

    const cameraEntity = world.createEntity();
    world.addComponent(cameraEntity, {
      type: "Camera2D",
      x: 0,
      y: 0,
      zoom: 1,
      shakeIntensity: 0,
      shakeOffsetX: 0,
      shakeOffsetY: 0,
      smoothing: 1, // Fast smoothing for test
      offset: { x: 0, y: 0 },
      bounds: null,
      deadzone: null,
      targets: [target],
      isMain: true
    } as Camera2DComponent);

    // Update with large deltaTime to reach target almost immediately due to smoothing 1
    cameraSystem.update(world, 1000);

    const cam = world.getComponent<Camera2DComponent>(cameraEntity, "Camera2D")!;
    // Target is at 1000,1000. Viewport is 800x600.
    // Target camera position should be 1000 - 800/2 = 600, 1000 - 600/2 = 700.
    expect(cam.x).toBeCloseTo(600, 0);
    expect(cam.y).toBeCloseTo(700, 0);
  });

  it("should follow multiple targets (focal point)", () => {
    const t1 = world.createEntity();
    world.addComponent(t1, { type: "Transform", x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);

    const t2 = world.createEntity();
    world.addComponent(t2, { type: "Transform", x: 1000, y: 1000, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);

    const cameraEntity = world.createEntity();
    world.addComponent(cameraEntity, {
      type: "Camera2D",
      x: 0,
      y: 0,
      zoom: 1,
      shakeIntensity: 0,
      shakeOffsetX: 0,
      shakeOffsetY: 0,
      smoothing: 1,
      offset: { x: 0, y: 0 },
      bounds: null,
      deadzone: null,
      targets: [t1, t2],
      isMain: true
    } as Camera2DComponent);

    cameraSystem.update(world, 1000);

    const cam = world.getComponent<Camera2DComponent>(cameraEntity, "Camera2D")!;
    // Focal point is (500, 500).
    // Target camera position: 500 - 400 = 100, 500 - 300 = 200.
    expect(cam.x).toBeCloseTo(100, 0);
    expect(cam.y).toBeCloseTo(200, 0);
  });

  it("should respect deadzone", () => {
    const target = world.createEntity();
    world.addComponent(target, { type: "Transform", x: 400, y: 300, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);

    const cameraEntity = world.createEntity();
    world.addComponent(cameraEntity, {
      type: "Camera2D",
      x: 0,
      y: 0,
      zoom: 1,
      shakeIntensity: 0,
      shakeOffsetX: 0,
      shakeOffsetY: 0,
      smoothing: 1,
      offset: { x: 0, y: 0 },
      bounds: null,
      deadzone: { minX: -50, minY: -50, maxX: 50, maxY: 50 },
      targets: [target],
      isMain: true
    } as Camera2DComponent);

    // Initial position: target (400,300) is at center of camera (0,0) with 800x600 viewport.
    // relX = (400 - (0 + 400)) = 0. relY = (300 - (0 + 300)) = 0.
    // Within deadzone (-50 to 50).
    cameraSystem.update(world, 16);
    let cam = world.getComponent<Camera2DComponent>(cameraEntity, "Camera2D")!;
    expect(cam.x).toBe(0);
    expect(cam.y).toBe(0);

    // Move target slightly, still within deadzone
    const trans = world.getComponent<TransformComponent>(target, "Transform")!;
    trans.x = 440; // relX = 440 - 400 = 40. < 50.
    cameraSystem.update(world, 16);
    expect(cam.x).toBe(0);

    // Move target outside deadzone
    trans.x = 460; // relX = 460 - 400 = 60. > 50.
    // moveX = 60 - 50 = 10.
    // targetCamX = 0 + 10 = 10.
    cameraSystem.update(world, 1000);
    expect(cam.x).toBeCloseTo(10, 0);
  });
});
