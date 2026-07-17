import { BaseGame, BaseGameConfig, GameLifecycleState } from "../runtime/BaseGame";
import { World } from "../ecs/World";
import { EventBus } from "../events/EventBus";

class TestGame extends BaseGame<any, any, any, any, any> {
  public systemDisposeMock = jest.fn();
  public accumulateHandler = jest.fn();

  constructor(config: BaseGameConfig<any, any> = {}) {
    super(config);
    // Mock loop as requested: start, stop, pause, resume
    this.loop = {
      start: jest.fn(),
      stop: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      subscribeUpdate: jest.fn(),
      subscribeRender: jest.fn()
    } as any;
  }

  public update(dt: number): void {}
  public getGameState(): any { return {}; }
  public isGameOver(): boolean { return false; }

  protected override async onRegisterSystems(): Promise<void> {
    this.world.addSystem({
      update: () => {},
      onRegister: () => {},
      dispose: this.systemDisposeMock
    });
    // Register handler on the real event bus during registerSystems
    this.eventBus.on("test-accumulate" as any, this.accumulateHandler);
  }
}

describe("BaseGame lifecycle", () => {
  test("destroy() clears all registered systems", async () => {
    const game = new TestGame();
    await game.init();
    expect(game.world.schedule.getSystems().length).toBe(1);

    game.destroy();
    expect(game.world.schedule.getSystems().length).toBe(0);
    expect(game.systemDisposeMock).toHaveBeenCalled();
  });

  test("destroy() clears eventBus handlers", async () => {
    const game = new TestGame();
    await game.init();

    const handler = jest.fn();
    game.eventBus.on("test-event" as any, handler);

    game.destroy();
    game.eventBus.emit("test-event" as any, {});
    expect(handler).not.toHaveBeenCalled();
  });

  test("restart() does not accumulate eventBus handlers", async () => {
    const game = new TestGame();
    await game.init();

    // Call restart 3 times
    await game.restart();
    await game.restart();
    await game.restart();

    // Reset calls to be absolutely sure we only count the final emit
    game.accumulateHandler.mockClear();

    // Emit the event
    game.eventBus.emit("test-accumulate" as any, {});

    // Must be called exactly 1 time, not 4 (1 from init + 3 from restarts) or 3
    expect(game.accumulateHandler).toHaveBeenCalledTimes(1);
  });

  test("pause() is idempotent", () => {
    const game = new TestGame();
    // Initially not paused
    expect(game.isPausedState()).toBe(false);

    game.pause();
    expect(game.isPausedState()).toBe(true);
    expect(game.getGameLoop().pause).toHaveBeenCalledTimes(1);

    // Call pause() again
    game.pause();
    expect(game.isPausedState()).toBe(true);
    // Should NOT call loop.pause() again
    expect(game.getGameLoop().pause).toHaveBeenCalledTimes(1);
  });

  test("resume() is idempotent", () => {
    const game = new TestGame();
    game.pause();
    expect(game.isPausedState()).toBe(true);
    expect(game.getGameLoop().resume).toHaveBeenCalledTimes(0);

    game.resume();
    expect(game.isPausedState()).toBe(false);
    expect(game.getGameLoop().resume).toHaveBeenCalledTimes(1);

    // Call resume() again
    game.resume();
    expect(game.isPausedState()).toBe(false);
    // Should NOT call loop.resume() again
    expect(game.getGameLoop().resume).toHaveBeenCalledTimes(1);
  });

  test("resume() without prior pause() is a no-op", () => {
    const game = new TestGame();
    expect(game.isPausedState()).toBe(false);

    game.resume();
    expect(game.isPausedState()).toBe(false);
    expect(game.getGameLoop().resume).not.toHaveBeenCalled();
  });
});
