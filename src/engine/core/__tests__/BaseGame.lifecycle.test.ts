import { BaseGame, GameStatus } from "../BaseGame";
import { World } from "../World";

// Implementación mínima para tests
class TestGame extends BaseGame<any, any> {
  public initializedEntitiesCount = 0;
  public registeredSystemsCount = 0;

  public initializeRenderer(): void {}
  public getGameState(): any { return {}; }
  public isGameOver(): boolean { return false; }

  protected registerSystems(): void {
    this.registeredSystemsCount++;
  }

  protected initializeEntities(): void {
    this.initializedEntitiesCount++;
  }

  // Sobrescribir para evitar dependencias de AsyncStorage en tests unitarios del core
  protected async registerEngineSystems(): Promise<void> {
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
});
