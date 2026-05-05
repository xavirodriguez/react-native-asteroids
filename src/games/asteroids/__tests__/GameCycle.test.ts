import { AsteroidsGame } from "../AsteroidsGame";
import { GameStatus } from "../../../engine/core/BaseGame";

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

describe("AsteroidsGame Integration", () => {
  let game: AsteroidsGame;

  beforeEach(() => {
    game = new AsteroidsGame();
  });

  afterEach(() => {
    game.destroy();
  });

  it("should complete a full game cycle: init -> play -> game over -> restart", async () => {
    // 1. Init
    expect(game.getStatus()).toBe(GameStatus.UNINITIALIZED);
    await game.init();
    expect(game.getStatus()).toBe(GameStatus.READY);

    // 2. Start
    game.start();
    expect(game.getStatus()).toBe(GameStatus.RUNNING);

    // 3. Play (simulate some ticks)
    const world = game.getWorld();

    // Manually update world
    for (let i = 0; i < 10; i++) {
        world.update(16.66);
    }

    expect(game.getGameState().score).toBe(0);

    // 4. Game Over (force lives to 0)
    world.mutateSingleton<any>("GameState", (gs) => {
        gs.lives = 0;
    });

    // In AsteroidsGame, the Ship usually has a Health component that the GameStateSystem reads.
    // Let's force all ships to have 0 health or just remove them.
    const ships = world.query("Ship", "Health");
    ships.forEach(s => {
        world.mutateComponent<any>(s, "Health", (h) => {
            h.current = 0;
        });
    });

    // One more update to trigger game over logic via system
    world.update(16.66);

    // The AsteroidGameStateSystem evaluates lives <= 0
    // Check if game reflects game over
    expect(game.isGameOver()).toBe(true);
    expect(game.isPausedState()).toBe(true);

    // 5. Restart
    await game.restart();
    expect(game.isGameOver()).toBe(false);
    expect(game.getGameState().lives).toBeGreaterThan(0);
    expect(game.getStatus()).toBe(GameStatus.RUNNING);
  });
});
