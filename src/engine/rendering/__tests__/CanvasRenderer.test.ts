import { World } from "../../core/World";
import { CanvasRenderer } from "../CanvasRenderer";

describe("CanvasRenderer Camera & Culling", () => {
  let world: World;
  let renderer: CanvasRenderer;
  const mockCtx = {
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    scale: jest.fn(),
    fillRect: jest.fn(),
    beginPath: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    clearRect: jest.fn(),
  } as unknown as CanvasRenderingContext2D;

  beforeEach(() => {
    world = new World();
    renderer = new CanvasRenderer(mockCtx);
    renderer.setSize(800, 600);
    jest.clearAllMocks();
  });

  it("should capture camera data in snapshot", () => {
    const camEntity = world.createEntity();
    world.addComponent(camEntity, {
      type: "Camera2D",
      x: 100,
      y: 200,
      zoom: 2,
      isMain: true,
      shakeOffsetX: 0,
      shakeOffsetY: 0,
      targets: []
    } as any);

    const snapshot = renderer.createSnapshot(world, 1);
    expect(snapshot.cameraX).toBe(100);
    expect(snapshot.cameraY).toBe(200);
    expect(snapshot.cameraZoom).toBe(2);
  });

  it("should cull entities outside the camera view", () => {
    // Camera at 0,0, view size 800x600 (zoom 1)
    const camEntity = world.createEntity();
    world.addComponent(camEntity, {
      type: "Camera2D",
      x: 0,
      y: 0,
      zoom: 1,
      isMain: true,
      shakeOffsetX: 0,
      shakeOffsetY: 0,
      targets: []
    } as any);

    // Entity inside
    const e1 = world.createEntity();
    world.addComponent(e1, { type: "Transform", x: 400, y: 300, rotation: 0 } as any);
    world.addComponent(e1, { type: "Render", shape: "circle", size: 10, color: "red" } as any);

    // Entity outside
    const e2 = world.createEntity();
    world.addComponent(e2, { type: "Transform", x: 1000, y: 1000, rotation: 0 } as any);
    world.addComponent(e2, { type: "Render", shape: "circle", size: 10, color: "blue" } as any);

    const snapshot = renderer.createSnapshot(world, 1);
    expect(snapshot.entityCount).toBe(1);
    expect(snapshot.entities[0].id).toBe(e1);
  });

  it("should apply camera transform during render", () => {
    const snapshot = renderer.createSnapshot(world, 1);
    snapshot.cameraX = 100;
    snapshot.cameraY = 200;
    snapshot.cameraZoom = 2;
    snapshot.shakeX = 10;
    snapshot.shakeY = 20;

    renderer.renderSnapshot(snapshot, world);

    // Order matters: 1. Screen Shake, 2. Scale, 3. -Cam
    expect(mockCtx.translate).toHaveBeenCalledWith(10, 20);
    expect(mockCtx.scale).toHaveBeenCalledWith(2, 2);
    expect(mockCtx.translate).toHaveBeenCalledWith(-100, -200);
  });
});
