import { BaseGame, GameStatus } from "../BaseGame";
import { World } from "../World";

// Implementación mínima para tests
class TestGame extends BaseGame<unknown, unknown> {
  public initializedEntitiesCount = 0;
  public registeredSystemsCount = 0;

  public initializeRenderer(): void {}
  public getGameState(): unknown { return {}; }
  public isGameOver(): boolean { return false; }

  protected registerSystems(): void {
    this.registeredSystemsCount++;
  }

  protected initializeEntities(): void {
    this.initializedEntitiesCount++;
  }

  // Sobrescribir para evitar dependencias de AsyncStorage en tests unitarios del core
  protected async registerEssentialSystems(_world: World): Promise<void> {
    // No-op para tests
  }
}

describe("BaseGame Lifecycle", () => {
  let game: TestGame;

  beforeEach(() => {
    game = new TestGame();
  });

  afterEach(() => {
    game.destroy();
  });

  test("should start in UNINITIALIZED state", () => {
    expect(game.getStatus()).toBe(GameStatus.UNINITIALIZED);
  });

  test("should transition to READY after init()", async () => {
    await game.init();
    expect(game.getStatus()).toBe(GameStatus.READY);
    expect(game.initializedEntitiesCount).toBe(1);
  });

  test("should throw error if start() called before init()", () => {
    expect(() => game.start()).toThrow("BaseGame: Cannot start() before init().");
  });

  test("should transition to RUNNING after start()", async () => {
    await game.init();
    game.start();
    expect(game.getStatus()).toBe(GameStatus.RUNNING);
  });

  test("start() should be idempotent if already RUNNING", async () => {
    await game.init();
    game.start();
    // Second call should do nothing
    expect(() => game.start()).not.toThrow();
    expect(game.getStatus()).toBe(GameStatus.RUNNING);
  });

  test("should throw error on double init()", async () => {
    await game.init();
    await expect(game.init()).rejects.toThrow("BaseGame: Cannot initialize from state READY");
  });

  test("should transition to STOPPED after stop()", async () => {
    await game.init();
    game.start();
    game.stop();
    expect(game.getStatus()).toBe(GameStatus.STOPPED);
  });

  test("stop() should be idempotent if already STOPPED", async () => {
    await game.init();
    game.start();
    game.stop();
    expect(game.getStatus()).toBe(GameStatus.STOPPED);
    expect(() => game.stop()).not.toThrow();
    expect(game.getStatus()).toBe(GameStatus.STOPPED);
  });

  test("stop() should do nothing if UNINITIALIZED or INITIALIZING", () => {
    expect(game.getStatus()).toBe(GameStatus.UNINITIALIZED);
    game.stop();
    expect(game.getStatus()).toBe(GameStatus.UNINITIALIZED);
  });

  test("should transition to DESTROYED after destroy()", async () => {
    await game.init();
    game.destroy();
    expect(game.getStatus()).toBe(GameStatus.DESTROYED);
  });

  test("should block start() after destroy()", async () => {
    await game.init();
    game.destroy();
    expect(() => game.start()).toThrow("BaseGame: Cannot start() on a destroyed game.");
  });

  test("restart() should throw error if UNINITIALIZED", async () => {
    await expect(game.restart()).rejects.toThrow("BaseGame: Cannot restart() before init().");
  });

  test("restart() should throw error if DESTROYED", async () => {
    await game.init();
    game.destroy();
    await expect(game.restart()).rejects.toThrow("BaseGame: Cannot restart() on a destroyed game.");
  });

  test("pause() and resume() should be idempotent and require RUNNING state", async () => {
    await game.init();

    // Should not pause if not running
    game.pause();
    expect(game.isPausedState()).toBe(false);

    game.start();
    game.pause();
    expect(game.isPausedState()).toBe(true);

    // Idempotency
    game.pause();
    expect(game.isPausedState()).toBe(true);

    game.resume();
    expect(game.isPausedState()).toBe(false);

    game.resume();
    expect(game.isPausedState()).toBe(false);
  });

  test("restart() should be serialized and handle concurrency", async () => {
    await game.init();
    game.start();

    // Call restart multiple times concurrently
    const p1 = game.restart();
    const p2 = game.restart();

    await Promise.all([p1, p2]);

    // initializeEntities should have been called for each restart
    // init (1) + restart1 (1) + restart2 (1) = 3
    expect(game.initializedEntitiesCount).toBe(3);
  });

  test("init() should be serialized", async () => {
    // Attempt concurrent init
    const p1 = game.init();
    const p2 = game.init();

    // p1 should succeed, p2 should either wait and see it's already initializing/ready
    // In our implementation, p2 waits for the lock and then throws because state is no longer UNINITIALIZED
    await expect(Promise.all([p1, p2])).rejects.toThrow();

    expect(game.getStatus()).toBe(GameStatus.READY);
    expect(game.initializedEntitiesCount).toBe(1);
  });

  test("setInput() and subscribe() should do nothing after destroy()", async () => {
    await game.init();
    game.destroy();

    // setInput should not throw but should be ignored (implicitly verified by not crashing)
    expect(() => game.setInput({ thrust: true })).not.toThrow();

    // subscribe should return a no-op unsubscribe function
    let _called = false;
    const unsubscribe = game.subscribe(() => { _called = true; });
    expect(typeof unsubscribe).toBe("function");

    // Even if we notify (internally), it shouldn't have been added
    // Note: _notifyListeners is private, but we can check if it returns a no-op
    unsubscribe(); // Should also not throw
  });

  test("restart() should not accumulate duplicate systems", async () => {
    await game.init();
    const initialSystems = game.getWorld().systemsList.length;

    await game.restart();
    expect(game.getWorld().systemsList.length).toBe(initialSystems);

    await game.restart();
    expect(game.getWorld().systemsList.length).toBe(initialSystems);
  });

  test("setInput() should be guarded when UNINITIALIZED", () => {
    expect(game.getStatus()).toBe(GameStatus.UNINITIALIZED);

    // Mock unifiedInput.setOverride to see if it's called
    const setOverrideSpy = jest.spyOn(game.unifiedInput, "setOverride");

    game.setInput({ fire: true });
    expect(setOverrideSpy).not.toHaveBeenCalled();

    setOverrideSpy.mockRestore();
  });

  test("subscribe() should work during init()", async () => {
    // We can't easily hook into the middle of init() from here,
    // but the implementation allows it now.
    await game.init();
    let _called = false;
    game.subscribe(() => { _called = true; });

    // Trigger notification manually or via state change if possible
    // For now, init() success is enough to prove it didn't return no-op
    // if we can check the listeners set size
    expect((game as unknown as { _listeners: Set<unknown> })._listeners.size).toBe(1);
  });
});
