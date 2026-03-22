import { GameLoop } from "../GameLoop";
import { World } from "../World";

describe("GameLoop", () => {
  let world: World;
  let gameLoop: GameLoop;

  beforeEach(() => {
    world = new World();
    jest.spyOn(world, "update");
    gameLoop = new GameLoop(world);

    // Mock requestAnimationFrame and performance.now
    jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      // We don't want it to actually loop infinitely in tests unless we trigger it
      return 0;
    });
    jest.spyOn(performance, "now").mockReturnValue(0);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    gameLoop.stop();
  });

  it("should perform fixed updates based on elapsed time", () => {
    const updateSpy = jest.fn();
    gameLoop.subscribeUpdate(updateSpy);

    gameLoop.start(); // lastTime = 0

    // Simulate one frame with 51ms elapsed
    // 51ms / (1000/60) ≈ 3.06 -> 3 updates (16.66 * 3 = 49.98)
    const loopCallback = (window.requestAnimationFrame as jest.Mock).mock.calls[0][0];

    (performance.now as jest.Mock).mockReturnValue(51);
    loopCallback(51);

    expect(world.update).toHaveBeenCalledTimes(3);
    expect(updateSpy).toHaveBeenCalledTimes(3);
    expect(updateSpy).toHaveBeenCalledWith(1000/60);
  });

  it("should trigger render listeners once per loop", () => {
    const renderSpy = jest.fn();
    gameLoop.subscribeRender(renderSpy);

    gameLoop.start();
    const loopCallback = (window.requestAnimationFrame as jest.Mock).mock.calls[0][0];

    (performance.now as jest.Mock).mockReturnValue(16);
    loopCallback(16);

    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(renderSpy).toHaveBeenCalledWith(16);
  });

  it("should cap deltaTime to prevent spiral of death", () => {
    gameLoop.start();
    const loopCallback = (window.requestAnimationFrame as jest.Mock).mock.calls[0][0];

    // Simulate a huge jump in time (e.g. 1 second)
    (performance.now as jest.Mock).mockReturnValue(1000.1);
    loopCallback(1000.1);

    // maxDeltaTime is 100ms.
    // 100ms / (16.666666666666668) = 6.0 exactly.
    // If there's any floating point precision issue, 100 might be slightly less than 6 * fixedDeltaTime.
    // Let's check for at least 5 and at most 6.
    const calls = (world.update as jest.Mock).mock.calls.length;
    expect(calls).toBeGreaterThanOrEqual(5);
    expect(calls).toBeLessThanOrEqual(6);
  });

  it("should stop when stop() is called", () => {
    gameLoop.start();
    gameLoop.stop();

    const loopCallback = (window.requestAnimationFrame as jest.Mock).mock.calls[0][0];
    (window.requestAnimationFrame as jest.Mock).mockClear();

    loopCallback(16);

    expect(window.requestAnimationFrame).not.toHaveBeenCalled();
  });
});
