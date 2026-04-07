import { GameLoop } from "../GameLoop";

describe("GameLoop", () => {
  let requestAnimationFrameSpy: jest.SpyInstance;
  let cancelAnimationFrameSpy: jest.SpyInstance;
  let performanceNowSpy: jest.SpyInstance;

  beforeEach(() => {
    requestAnimationFrameSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      return 1;
    });
    cancelAnimationFrameSpy = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    performanceNowSpy = jest.spyOn(performance, 'now').mockReturnValue(0);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should calculate correct alpha and calls updates", () => {
    const gameLoop = new GameLoop();
    const updateListener = jest.fn();
    const renderListener = jest.fn();
    gameLoop.subscribeUpdate(updateListener);
    gameLoop.subscribeRender(renderListener);

    performanceNowSpy.mockReturnValue(100);
    gameLoop.start();

    // Get the loop function
    const loop = requestAnimationFrameSpy.mock.calls[0][0];

    // deltaTime = 125 - 100 = 25
    performanceNowSpy.mockReturnValue(125);
    loop(125);

    expect(updateListener).toHaveBeenCalledTimes(1);
    expect(updateListener).toHaveBeenCalledWith(expect.closeTo(16.66, 1));

    // 25 - 16.66 = 8.34. alpha = 8.34 / 16.66 = 0.5
    expect(renderListener).toHaveBeenCalledWith(expect.closeTo(0.5, 1), 25);
  });

  it("should clamp delta time to maxDeltaMs", () => {
    const updateListener = jest.fn();
    // Use fixedDeltaTime = 16.666666666666668.
    // 16.666... * 5 = 83.333...
    // 16.666... * 6 = 100.
    // Let's use maxDeltaMs = 85.
    const gameLoop = new GameLoop({ maxDeltaMs: 85 });
    gameLoop.subscribeUpdate(updateListener);

    performanceNowSpy.mockReturnValue(100);
    gameLoop.start();

    const loop = requestAnimationFrameSpy.mock.calls[0][0];

    // 1000ms elapsed. Should be clamped to 85ms.
    // 85 / 16.66... = 5.1 -> 5 updates.
    performanceNowSpy.mockReturnValue(1100);
    loop(1100);

    expect(updateListener).toHaveBeenCalledTimes(5);
  });

  it("should have alpha between 0 and 1", () => {
    const gameLoop = new GameLoop();
    const renderListener = jest.fn();
    gameLoop.subscribeRender(renderListener);
    performanceNowSpy.mockReturnValue(100);
    gameLoop.start();
    const loop = requestAnimationFrameSpy.mock.calls[0][0];

    performanceNowSpy.mockReturnValue(110);
    loop(110);
    expect(renderListener.mock.calls[0][0]).toBeGreaterThanOrEqual(0);
    expect(renderListener.mock.calls[0][0]).toBeLessThan(1);
  });
});
