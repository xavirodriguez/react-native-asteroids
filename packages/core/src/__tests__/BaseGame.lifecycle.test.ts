import { BaseGame, BaseGameConfig, GameLifecycleState } from "../runtime/BaseGame";
import { World } from "../ecs/World";
import { EventBus } from "../events/EventBus";

class TestGame extends BaseGame<any, any, any, any, any> {
  public systemDisposeMock = jest.fn();

  constructor(config: BaseGameConfig<any, any> = {}) {
    super(config);
    // Override loop with mock as requested
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

    // Register a handler on the event bus
    const handler = jest.fn();
    game.eventBus.on("test" as any, handler);

    // Initial handler count on event bus
    // In our implementation, eventBus is preserved, so to assert accumulation we can check
    // how many times a registered listener gets triggered or we can measure length of listeners list
    // if EventBus exposes it, or emit to verify.
    // Let's do 3 restarts
    await game.restart();
    await game.restart();
    await game.restart();

    // After restarts, the previous handler from before restart was cleared, so it shouldn't fire
    game.eventBus.emit("test" as any, {});
    expect(handler).not.toHaveBeenCalled();
  });

  test("pause() is idempotent", () => {
    const game = new TestGame();
    // Initially RUNNING
    expect(game.getLifecycleState()).toBe(GameLifecycleState.RUNNING);

    game.pause();
    expect(game.getLifecycleState()).toBe(GameLifecycleState.PAUSED);
    expect(game.getGameLoop().pause).toHaveBeenCalledTimes(1);

    // Call pause() again
    game.pause();
    expect(game.getLifecycleState()).toBe(GameLifecycleState.PAUSED);
    // Should NOT call loop.pause() again
    expect(game.getGameLoop().pause).toHaveBeenCalledTimes(1);
  });

  test("resume() is idempotent", () => {
    const game = new TestGame();
    game.pause();
    expect(game.getLifecycleState()).toBe(GameLifecycleState.PAUSED);
    expect(game.getGameLoop().resume).toHaveBeenCalledTimes(0);

    game.resume();
    expect(game.getLifecycleState()).toBe(GameLifecycleState.RUNNING);
    expect(game.getGameLoop().resume).toHaveBeenCalledTimes(1);

    // Call resume() again
    game.resume();
    expect(game.getLifecycleState()).toBe(GameLifecycleState.RUNNING);
    // Should NOT call loop.resume() again
    expect(game.getGameLoop().resume).toHaveBeenCalledTimes(1);
  });

  test("resume() after resume() (was never paused) is a no-op", () => {
    const game = new TestGame();
    expect(game.getLifecycleState()).toBe(GameLifecycleState.RUNNING);

    game.resume();
    expect(game.getLifecycleState()).toBe(GameLifecycleState.RUNNING);
    expect(game.getGameLoop().resume).not.toHaveBeenCalled();
  });

  test("destroy -> restart -> destroy sequence (no race conditions)", async () => {
    const game = new TestGame();
    await game.init();

    game.destroy();
    expect(game.getLifecycleState()).toBe(GameLifecycleState.DESTROYED);

    await game.restart();
    expect(game.getLifecycleState()).toBe(GameLifecycleState.RUNNING);

    game.destroy();
    expect(game.getLifecycleState()).toBe(GameLifecycleState.DESTROYED);
  });
});
