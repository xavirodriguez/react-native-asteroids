import { AsteroidsGame, NullAsteroidsGame } from "../AsteroidsGame";
import { World } from "../../../engine/core/World";
import { INITIAL_GAME_STATE } from "../../../types/GameTypes";

describe("NullAsteroidsGame", () => {
  it("returns default values correctly", () => {
    const game = new NullAsteroidsGame();
    expect(game.getWorld()).toBeInstanceOf(World);
    expect(game.isPausedState()).toBe(false);
    expect(game.isGameOver()).toBe(false);
    expect(game.getGameState()).toEqual(INITIAL_GAME_STATE);
  });

  it("subscribe returns a function that doesn't throw when called", () => {
    const game = new NullAsteroidsGame();
    const unsubscribe = game.subscribe(() => {});
    expect(typeof unsubscribe).toBe("function");
    expect(() => unsubscribe()).not.toThrow();
  });

  it("can call other methods without side effects", () => {
    const game = new NullAsteroidsGame();
    expect(() => {
      game.pause();
      game.resume();
      game.restart();
      game.setInput({ thrust: true });
      game.destroy();
    }).not.toThrow();
  });
});

describe("AsteroidsGame", () => {
  let game: AsteroidsGame;

  beforeEach(() => {
    jest.spyOn(global, 'requestAnimationFrame').mockImplementation((cb) => {
        return setTimeout(() => (cb as any)(performance.now()), 16) as any;
    });
    jest.spyOn(global, 'cancelAnimationFrame').mockImplementation((id) => {
        clearTimeout(id as any);
    });
    game = new AsteroidsGame();
  });

  afterEach(() => {
    game.destroy();
    jest.restoreAllMocks();
  });

  it("initializes correctly", () => {
    const world = game.getWorld();
    expect(world).toBeDefined();
    // Verify entities are created (Ship, GameState, etc)
    const gameStates = world.query("GameState");
    expect(gameStates.length).toBe(1);
    const ships = world.query("Ship");
    expect(ships.length).toBe(1);
  });

  it("getGameState() returns initial state", () => {
    const state = game.getGameState();
    expect(state.lives).toBe(3);
    expect(state.score).toBe(0);
    expect(state.level).toBe(1);
  });

  it("isPausedState() returns false initially", () => {
    expect(game.isPausedState()).toBe(false);
  });

  it("isGameOver() returns false initially", () => {
    expect(game.isGameOver()).toBe(false);
  });

  it("pause() and resume() toggle paused state", () => {
    game.start();
    game.pause();
    expect(game.isPausedState()).toBe(true);
    game.resume();
    expect(game.isPausedState()).toBe(false);
  });

  it("restart() resets the score", () => {
    game.start();
    const state = game.getGameState();
    state.score = 1000;
    game.restart();
    expect(game.getGameState().score).toBe(0);
  });

  it("subscribe() notifies listener on pause", () => {
    const listener = jest.fn();
    game.subscribe(listener);
    game.start();
    game.pause();
    expect(listener).toHaveBeenCalled();
  });

  it("destroy() does not throw errors", () => {
    expect(() => game.destroy()).not.toThrow();
  });

  it("stop() stops the game loop", () => {
    const cancelSpy = jest.spyOn(global, 'cancelAnimationFrame');
    // Mock gameLoopId so stop() has something to cancel
    const gameInternal = (game as any);
    const gameLoopInternal = gameInternal.gameLoop;
    gameLoopInternal.gameLoopId = 123;
    gameLoopInternal.isRunning = true;

    game.stop();
    expect(cancelSpy).toHaveBeenCalledWith(123);
    expect(gameLoopInternal.isRunning).toBe(false);
  });

  it("setInput() guards against input when paused", () => {
    game.start();
    game.pause();
    const world = game.getWorld();
    const ship = world.query("Ship", "Input")[0];
    const input = world.getComponent<import("../../../types/GameTypes").InputComponent>(ship, "Input")!;

    game.setInput({ thrust: true });
    // Update world to propagate input state to components
    world.update(16);
    expect(input.thrust).toBe(false);

    game.resume();
    game.setInput({ thrust: true });
    world.update(16);
    expect(input.thrust).toBe(true);
  });

  it("handles keyboard events", () => {
    const pauseSpy = jest.spyOn(game, 'pause');
    const restartSpy = jest.spyOn(game, 'restart');

    const pauseEvent = { code: 'KeyP' } as KeyboardEvent;
    (game as unknown as { handleGlobalKeyDown: (e: KeyboardEvent) => void }).handleGlobalKeyDown(pauseEvent);
    expect(pauseSpy).toHaveBeenCalled();

    const restartEvent = { code: 'KeyR' } as KeyboardEvent;
    (game as unknown as { handleGlobalKeyDown: (e: KeyboardEvent) => void }).handleGlobalKeyDown(restartEvent);
    expect(restartSpy).toHaveBeenCalled();
  });
});
